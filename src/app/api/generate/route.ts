import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import { fal } from "@fal-ai/client";
import { promises as fsp } from "fs";
import path from "path";
import crypto from "crypto";
import dns from "dns/promises";
import sharp from "sharp";
import { MAX_GARMENT_REFERENCES } from "@/lib/catalogData";
import { CREDIT_PRICE_INR, creditsFromBalance } from "@/lib/pricing";

// No silent placeholder fallbacks: a missing env var must fail loudly as a 503
// instead of building a client that points at "placeholder.supabase.co".
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Fal.ai client
const falKey = (process.env.FAL_KEY || "").trim();
if (falKey) {
  fal.config({ credentials: falKey });
}

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// ---------------------------------------------------------------------------
// Resource limits
// ---------------------------------------------------------------------------
/** Hard ceiling on the JSON request body (base64 garment data URLs live here). */
const MAX_BODY_BYTES = 6 * 1024 * 1024;
/** Hard ceiling on any single reference image we download (before sharp). */
const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
/** Timeout for one reference-image fetch attempt. */
const REFERENCE_FETCH_TIMEOUT_MS = 20_000;
/** Timeout for the paid Fal inference call. */
const FAL_RUN_TIMEOUT_MS = 180_000;
/** Timeout for uploading a prepared reference to Fal storage. */
const FAL_UPLOAD_TIMEOUT_MS = 45_000;
/** Timeout for the billing RPC. */
const RPC_TIMEOUT_MS = 15_000;
/** Per-user sustained rate: max completed generations inside this window. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 3;
/** Minimum spacing between two generations started by the same user. */
const PER_USER_COOLDOWN_MS = 5_000;
/** Global cap on simultaneous paid Fal runs (all users). */
const MAX_CONCURRENT_FAL_RUNS = 2;

// ---------------------------------------------------------------------------
// Upload cache: hashed keys (never store megabytes of base64 as a Map key),
// TTL, and a hard entry cap so the Map cannot grow without bound.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 128;
const publicUrlCache = new Map<string, { url: string; at: number }>();

function makeCacheKey(raw: string, maxDim: number): string {
  const digest = crypto.createHash("sha256").update(raw).digest("hex");
  return `${digest}_c_${maxDim}`;
}

function cacheGet(key: string): string | undefined {
  const hit = publicUrlCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    publicUrlCache.delete(key);
    return undefined;
  }
  return hit.url;
}

function cacheSet(key: string, url: string): void {
  if (publicUrlCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = publicUrlCache.keys().next().value;
    if (oldest !== undefined) publicUrlCache.delete(oldest);
  }
  publicUrlCache.set(key, { url, at: Date.now() });
}


/**
 * Minimal shape of the Fal run payload we actually consume. Fal's schema varies
 * across model versions (flat `images` vs nested `data.images`), so both are
 * modelled and normalised at the point of use.
 */
interface FalImageRef {
  url?: string;
  width?: number;
  height?: number;
}

interface FalRunResult {
  images?: FalImageRef[];
  image?: FalImageRef;
  data?: {
    images?: FalImageRef[];
    image?: FalImageRef;
  };
}

/**
 * Error whose `message` is intentionally written to be shown to end users.
 * The outer catch only echoes messages that are instances of this class, so raw
 * upstream errors and absolute filesystem paths never leak to the client.
 * `status` becomes the HTTP status; `retryable` tells `retryOperation` whether
 * repeating the attempt could possibly succeed.
 */
class ClientSafeError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status = 400, retryable = false) {
    super(message);
    this.name = "ClientSafeError";
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Hard ceiling on total reference images sent to Fal in magic mode:
 * 1 pose + 1 face + 1 background + MAX_GARMENT_REFERENCES garments.
 */
const MAX_TOTAL_REFERENCES = 3 + MAX_GARMENT_REFERENCES;

/** Client-safe label for a reference source, with no filesystem paths or raw upstream text. */
function describeRefSource(urlOrPath: string): string {
  const trimmed = urlOrPath.trim();
  if (trimmed.startsWith("data:")) return "inline uploaded image";
  if (trimmed.startsWith("blob:")) return "temporary browser preview";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      return `remote image at ${new URL(trimmed).hostname}`;
    } catch {
      return "remote image";
    }
  }
  return "catalog reference image";
}

// ---------------------------------------------------------------------------
// SSRF protection: the payload can point at any http(s) URL, so every remote
// reference is host-checked before we connect (private/loopback/link-local/
// metadata ranges rejected, only web ports allowed, redirects re-validated).
//
// Note: DNS is resolved just before connecting, so a hostile resolver could in
// theory answer differently on the second lookup (DNS rebinding). Closing that
// last gap would require pinning the resolved IP into the socket, which the
// fetch API does not expose; for this app the range checks are the practical
// control.
// ---------------------------------------------------------------------------
const ALLOWED_PORTS = new Set([80, 443]);

const IPV4_BLOCKLIST: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC1918
  ["100.64.0.0", 10], // CGNAT (incl. some cloud metadata aliases)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local incl. 169.254.169.254 metadata
  ["172.16.0.0", 12], // RFC1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // RFC1918
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
  const addr = ipv4ToInt(ip);
  if (addr < 0) return true; // unparseable => refuse
  for (const [base, prefix] of IPV4_BLOCKLIST) {
    const baseInt = ipv4ToInt(base);
    if (baseInt < 0) continue;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    if ((addr & mask) === (baseInt & mask)) return true;
  }
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:1.2.3.4) and IPv4-compatible forms
  const mapped = lower.match(/^::(?:ffff:|)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  if (lower === "::" || lower === "::1") return true; // unspecified / loopback
  const firstHextet = Number.parseInt((lower.split(":")[0] || "0"), 16);
  if (Number.isNaN(firstHextet)) return true;
  if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

function isBlockedAddress(addr: string): boolean {
  return addr.includes(":") ? isBlockedIPv6(addr) : isBlockedIPv4(addr);
}

/** Validates a user-supplied URL is a web URL we are willing to connect to. */
function assertWebUrl(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ClientSafeError(`Invalid ${label} reference. Please re-upload the image.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ClientSafeError(`Unsupported ${label} reference. Please re-upload the image.`);
  }
  const port = url.port ? Number.parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) {
    throw new ClientSafeError(`Unsupported ${label} reference host.`);
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local")) {
    throw new ClientSafeError(`Unsupported ${label} reference host.`);
  }
  return url;
}

/** Resolves the hostname and refuses anything that lands in a private range. */
async function assertFetchableUrl(raw: string, label: string): Promise<URL> {
  const url = assertWebUrl(raw, label);
  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new ClientSafeError(`Could not resolve the ${label} reference host.`, 400, true);
  }
  if (!addresses.length) {
    throw new ClientSafeError(`Could not resolve the ${label} reference host.`, 400, true);
  }
  for (const entry of addresses) {
    if (isBlockedAddress(entry.address)) {
      console.warn(`SSRF guard blocked reference host '${url.hostname}' -> ${entry.address}`);
      throw new ClientSafeError(`Unsupported ${label} reference host.`);
    }
  }
  return url;
}

/** Reads a response body while enforcing a byte ceiling (also checks content-length). */
async function readBodyCapped(res: Response): Promise<Buffer> {
  const declared = Number.parseInt(res.headers.get("content-length") || "0", 10);
  if (Number.isFinite(declared) && declared > MAX_REFERENCE_BYTES) {
    throw new ClientSafeError("Reference image is too large. Please upload a smaller image.", 413);
  }
  if (!res.body) {
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_REFERENCE_BYTES) {
      throw new ClientSafeError("Reference image is too large. Please upload a smaller image.", 413);
    }
    return buffer;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REFERENCE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new ClientSafeError("Reference image is too large. Please upload a smaller image.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

// ---------------------------------------------------------------------------
// Input normalisation: free text is interpolated straight into the paid prompt,
// so it is length-capped and stripped of control characters, and the enum-like
// fields are validated rather than silently falling through to defaults.
// ---------------------------------------------------------------------------
const VALID_MODES = new Set(["sarees", "magic"]);
const VALID_FACE_MODES = new Set(["keep_original", "custom_face", "random_face"]);
const VALID_ASPECT_RATIOS = new Set(["4:5", "3:4", "9:16", "1:1"]);
const VALID_BACKGROUND_MODES = new Set(["inspiration", "custom"]);

function clampText(value: unknown, max = 500, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function optionalText(value: unknown, max = 500): string | null {
  const text = clampText(value, max, "");
  return text.length > 0 ? text : null;
}

// ---------------------------------------------------------------------------
// Concurrency / rate limiting for the paid pipeline.
// ---------------------------------------------------------------------------
let activeFalRuns = 0;
const lastRunStartedAt = new Map<string, number>();

function pruneCooldowns(): void {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [userId, at] of lastRunStartedAt) {
    if (at < cutoff) lastRunStartedAt.delete(userId);
  }
}

/** Global concurrency gate: bounded waiting, then a 429 instead of unbounded queueing. */
async function acquireFalSlot(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (activeFalRuns < MAX_CONCURRENT_FAL_RUNS) {
      activeFalRuns++;
      return;
    }
    if (Date.now() > deadline) {
      throw new ClientSafeError(
        "The generator is at capacity right now. Please try again in a few seconds.",
        429
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function releaseFalSlot(): void {
  activeFalRuns = Math.max(0, activeFalRuns - 1);
}

/**
 * Resolves, downsizes, and compresses ANY input image (local file, base64 data URI, or remote URL)
 * to a maximum dimension of 640px before uploading to Fal CDN storage.
 *
 * Why 640px?
 * - At 640px max dimension, a 3:4 or 4:5 portrait reference is ~0.31 - 0.33 Megapixels.
 * - With up to 6 input references (1 pose + 1 face + 1 bg + 3 garments):
 *   Total input area is ~1.9 Megapixels.
 * - Combined with the native ~4.61 - 4.73 Megapixel catalog output (e.g. 1920x2400):
 *   Total area is ~7.3 Megapixels, safely under Fal's 9.0 Megapixel limit!
 * - This guarantees that Fal.ai flux-2-pro/edit will NEVER throw the 422 "Requested area too large" error.
 *
 * Throws an Error whose `message` is already client-safe on every failure path.
 */
async function getCompressedFalUrl(urlOrPath: string, maxDim = 640): Promise<string> {
  if (!urlOrPath) return "";
  const trimmed = urlOrPath.trim();
  const cacheKey = makeCacheKey(trimmed, maxDim);
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const label = describeRefSource(trimmed);
  let inputBuffer: Buffer | null = null;

  if (trimmed.startsWith("data:")) {
    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,([\s\S]+)$/);
    if (matches && matches[2]) {
      if (matches[2].length > MAX_REFERENCE_BYTES) {
        throw new ClientSafeError(
          "Reference image is too large. Please upload a smaller image.", 413
        );
      }
      inputBuffer = Buffer.from(matches[2], "base64");
    }
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    inputBuffer = await fetchRemoteReference(trimmed);
  } else {
    // Guard against schemes that are neither data:, http(s): nor a real on-disk path.
    // Previously a blob:/object URL fell through to the filesystem branch and produced a
    // confusing "file not found" error containing an absolute path.
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      throw new ClientSafeError(
        `Unsupported image reference (${label}). Please re-upload the image.`
      );
    }

    let localRelative = trimmed;
    if (localRelative.startsWith("/")) localRelative = localRelative.slice(1);

    // Contain the resolved path inside public/ to block traversal via "../".
    const publicRoot = path.resolve(process.cwd(), "public");
    const filePath = path.resolve(publicRoot, localRelative);
    if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
      throw new ClientSafeError(`Unsupported image reference (${label}).`);
    }

    // Non-blocking I/O: a synchronous read would stall every other request.
    let stats;
    try {
      stats = await fsp.stat(filePath);
    } catch {
      throw new ClientSafeError(`Reference image not found (${label}).`, 404);
    }
    if (!stats.isFile()) {
      throw new ClientSafeError(`Reference image not found (${label}).`, 404);
    }
    if (stats.size > MAX_REFERENCE_BYTES) {
      throw new ClientSafeError(
        "Reference image is too large. Please upload a smaller image.", 413
      );
    }
    inputBuffer = await fsp.readFile(filePath);
  }

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new ClientSafeError(`Reference image is empty (${label}).`);
  }

  // Compress to maxDim (640px) with sharp
  try {
    inputBuffer = await sharp(inputBuffer, { limitInputPixels: 60_000_000 })
      .resize({
        width: maxDim,
        height: maxDim,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.error(`sharp failed to process ${label}:`, err);
    throw new ClientSafeError(
      `Could not read the image (${label}). It may be corrupt or in an unsupported format.`
    );
  }

  const blob = new Blob([new Uint8Array(inputBuffer)], { type: "image/jpeg" });
  let uploadedUrl: string | null = null;
  try {
    uploadedUrl = await withTimeout(
      fal.storage.upload(blob),
      FAL_UPLOAD_TIMEOUT_MS,
      "reference upload"
    );
  } catch (err) {
    // Never surface Fal SDK internals (request ids, auth text) to the client.
    console.error(`Fal storage upload failed for ${label}:`, err);
    throw new ClientSafeError(
      `Could not host the compressed image (${label}). Please try again.`,
      502,
      true
    );
  }

  if (!uploadedUrl) {
    throw new ClientSafeError(
      `Could not host the compressed image (${label}). Please try again.`,
      502,
      true
    );
  }

  cacheSet(cacheKey, uploadedUrl);
  console.log(`DEBUG: Compressed & uploaded ${label} (maxDim ${maxDim}px) to Fal storage.`);
  return uploadedUrl;
}

/**
 * Downloads a remote reference with host validation, redirect re-validation,
 * a byte ceiling, timeout, and retry/backoff that skips non-retryable 4xx.
 */
async function fetchRemoteReference(rawUrl: string): Promise<Buffer> {
  const label = describeRefSource(rawUrl);
  let lastError: ClientSafeError | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let target = await assertFetchableUrl(rawUrl, "reference image");
      const requestHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlorusLookbook/1.0",
        "Accept": "image/*,*/*;q=0.8",
      };

      let response = await fetch(target, {
        headers: requestHeaders,
        redirect: "manual",
        signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS),
      });

      // Follow a bounded number of redirects, validating every hop again.
      for (let hop = 0; hop < 3 && response.status >= 300 && response.status < 400; hop++) {
        const location = response.headers.get("location");
        if (!location) break;
        target = await assertFetchableUrl(new URL(location, target).toString(), "reference image");
        response = await fetch(target, {
          headers: requestHeaders,
          redirect: "manual",
          signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS),
        });
      }

      if (response.ok) {
        return await readBodyCapped(response);
      }

      const retryable =
        response.status === 408 || response.status === 429 || response.status >= 500;
      // Do not hammer a permanent 4xx three times back-to-back.
      lastError = new ClientSafeError(`Could not fetch the reference image (${label}).`, 400, retryable);
      if (!retryable) break;
    } catch (err) {
      if (err instanceof ClientSafeError) {
        lastError = err;
        if (!err.retryable) break;
      } else {
        // Network/timeout errors can embed the full URL, so only the reason is surfaced.
        console.warn(`Fetch attempt ${attempt} failed for ${label}:`, err);
        lastError = new ClientSafeError(
          `Could not reach the reference image (${label}). Check your connection and try again.`,
          400,
          true
        );
      }
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw lastError || new ClientSafeError(`Could not fetch the reference image (${label}).`);
}

/** Bounds an awaited operation without leaving the caller hanging forever. */
async function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out ${what} after ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Retry with exponential backoff. Errors explicitly marked non-retryable
 * (bad input, blocked host, permanent upstream 4xx) fail immediately instead of
 * being repeated against a paid API.
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      const retryable =
        !(error instanceof ClientSafeError) || error.retryable;
      if (!retryable || attempt > retries) {
        throw error;
      }
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.warn(
        `DEBUG: Attempt ${attempt} failed. Retrying in ${waitTime}ms... Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

function serviceUnavailable(reason: string): NextResponse {
  // The generation never happened, so no credit is ever taken here. Anything
  // that would previously have returned a stock placeholder image now surfaces
  // as an honest 503 that both workspaces display to the user.
  console.error(`Generation service unavailable: ${reason}`);
  return NextResponse.json(
    {
      error:
        "Image generation is temporarily unavailable and no credits were charged. Please try again in a moment.",
    },
    { status: 503 }
  );
}

export async function POST(req: NextRequest) {
  // 0. Fail fast when the deploy is missing configuration (no placeholder fallback).
  if (!supabaseUrl || !supabaseAnonKey) {
    return serviceUnavailable("missing Supabase environment configuration");
  }

  // 1. Auth check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || token === "undefined" || token === "null") {
    return NextResponse.json({ error: "Unauthorized: Active user session required" }, { status: 401 });
  }

  // Instantiate standard supabase client authenticated as the user
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized: Active user session required" }, { status: 401 });
    }

    // 1b. Sustained rate limit, measured from the generations ledger (indexed).
    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count: recentCount, error: rateError } = await supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);
    if (rateError) {
      console.error("Rate limit check failed:", rateError.message);
      return serviceUnavailable("rate limit lookup failed");
    }
    if ((recentCount ?? 0) >= RATE_MAX_PER_WINDOW) {
      return NextResponse.json(
        { error: `Generation limit reached: max ${RATE_MAX_PER_WINDOW} per minute. Please wait a moment.` },
        { status: 429 }
      );
    }

    // 1c. Short per-user cooldown (covers attempts that failed before a ledger row existed)
    pruneCooldowns();
    const lastStart = lastRunStartedAt.get(user.id);
    if (lastStart && Date.now() - lastStart < PER_USER_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Please wait a few seconds between generations." },
        { status: 429 }
      );
    }

    // 2. Parse input request payload (bounded, malformed JSON => 400 not 500)
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request payload is too large. Please upload fewer or smaller images." },
        { status: 413 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
    }

    const {
      mode = "sarees",
      outfitType: rawOutfitType = "Wholesale Saree (6-Yard)",

      // Master photoshoot reference (Zero Hallucination Anchor)
      shootTitle: rawShootTitle = "Morning Sun Botanical Garden",
      shootImageUrl: rawShootImageUrl = "/reference_shoots/garden_01_morning_sun.jpg",
      shootSetting: rawShootSetting = "Sunlit Botanical Garden with Lush Foliage & Natural Morning Flare",

      // 3 Face Modes: "keep_original" | "custom_face" | "random_face"
      faceMode = "keep_original",
      customFaceUrl: rawCustomFaceUrl = null,
      aspectRatio = "4:5",

      // Magic Mode parameters
      modelName: rawModelName = "Indian Female Model",
      modelFaceUrl: rawModelFaceUrl = null,
      poseId: rawPoseId = "01_hand_on_hip_full_length",
      poseName: rawPoseName = "Hand on Hip — Full Length",
      poseImageUrl: rawPoseImageUrl = "",
      poseDescription: rawPoseDescription = "",
      backgroundId: rawBackgroundId = "01_pastel_palace_interior",
      backgroundName: rawBackgroundName = "Pastel Painted Palace Interior",
      backgroundUrl: rawBackgroundUrl = "",
      backgroundDescription: rawBackgroundDescription = "",
      backgroundMode = "inspiration",
      hairstyle: rawHairstyle = "Default (as before)",
      hairstyleDescription: rawHairstyleDescription = "",
      jewellery: rawJewellery = "Default (as before)",
      jewelleryDescription: rawJewelleryDescription = "",
      fabric: rawFabric = "Auto-Detect from Photo (Default)",
      fabricDescription: rawFabricDescription = "",
      fabricDrapePhysics: rawFabricDrapePhysics = "",
      customNotes: rawCustomNotes = "",
      garments = [],
      idempotencyKey = null,
    } = body as Record<string, unknown>;

    // 2b. Enum validation: unknown values must not silently fall through to defaults.
    if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
      return NextResponse.json({ error: "Unsupported generation mode." }, { status: 400 });
    }
    if (typeof faceMode !== "string" || !VALID_FACE_MODES.has(faceMode)) {
      return NextResponse.json({ error: "Unsupported face mode." }, { status: 400 });
    }
    if (typeof aspectRatio !== "string" || !VALID_ASPECT_RATIOS.has(aspectRatio)) {
      return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });
    }
    if (typeof backgroundMode !== "string" || !VALID_BACKGROUND_MODES.has(backgroundMode)) {
      return NextResponse.json({ error: "Unsupported background mode." }, { status: 400 });
    }
    if (
      idempotencyKey !== null &&
      (typeof idempotencyKey !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey))
    ) {
      return NextResponse.json({ error: "Invalid request identifier." }, { status: 400 });
    }

    // 2c. Free text is interpolated into the paid prompt: cap and sanitise it.
    const outfitType = clampText(rawOutfitType, 200, "ethnic outfit");
    const shootTitle = clampText(rawShootTitle, 200, "Morning Sun Botanical Garden");
    const shootSetting = clampText(rawShootSetting, 400, "");
    const shootImageUrl = clampText(rawShootImageUrl, 8000, "");
    const modelName = clampText(rawModelName, 200, "Indian Female Model");
    const poseName = clampText(rawPoseName, 200, "");
    const poseDescription = clampText(rawPoseDescription, 600, "");
    const poseImageUrl = clampText(rawPoseImageUrl, 8000, "");
    const backgroundName = clampText(rawBackgroundName, 200, "");
    const backgroundDescription = clampText(rawBackgroundDescription, 600, "");
    const backgroundUrl = clampText(rawBackgroundUrl, 8000, "");
    const hairstyle = clampText(rawHairstyle, 200, "Default (as before)");
    const hairstyleDescription = clampText(rawHairstyleDescription, 400, "");
    const jewellery = clampText(rawJewellery, 200, "Default (as before)");
    const jewelleryDescription = clampText(rawJewelleryDescription, 400, "");
    const fabric = clampText(rawFabric, 200, "Auto-Detect from Photo (Default)");
    const fabricDescription = clampText(rawFabricDescription, 400, "");
    const fabricDrapePhysics = clampText(rawFabricDrapePhysics, 400, "");
    const customNotes = clampText(rawCustomNotes, 1500, "");
    const customFaceUrl = optionalText(rawCustomFaceUrl, 8000);
    const modelFaceUrl = optionalText(rawModelFaceUrl, 8000);
    const poseId = clampText(rawPoseId, 100, "");
    const backgroundId = clampText(rawBackgroundId, 100, "");


    interface GarmentItem {
      url: string;
      note?: string;
      slotId?: string;
      slotLabel?: string;
    }

    const rawGarmentList: unknown[] = Array.isArray(garments) ? (garments as unknown[]) : [];
    const rawGarments: GarmentItem[] = rawGarmentList
      .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === "object")
      .map((g) => ({
        url: typeof g.url === "string" ? g.url.trim().slice(0, MAX_BODY_BYTES) : "",
        note: typeof g.note === "string" ? clampText(g.note, 400, "") : "",
        slotId: typeof g.slotId === "string" ? clampText(g.slotId, 60, "") : undefined,
        slotLabel: typeof g.slotLabel === "string" ? clampText(g.slotLabel, 60, "") : undefined,
      }));

    // Strictly enforce the garment reference ceiling
    const activeGarments: GarmentItem[] = rawGarments
      .filter((g: GarmentItem) => Boolean(g && g.url))
      .slice(0, MAX_GARMENT_REFERENCES);

    if (activeGarments.length === 0) {
      return NextResponse.json({ error: "At least one product fabric reference image is required" }, { status: 400 });
    }

    if (rawGarments.filter((g: GarmentItem) => Boolean(g && g.url)).length > MAX_GARMENT_REFERENCES) {
      console.warn(
        `Request sent ${rawGarments.length} garment references; using the first ${MAX_GARMENT_REFERENCES}.`
      );
    }

    // Fetch profile balance from database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance_inr")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // Never echo database diagnostics back to the client.
      console.error(`Profile query failed for user ${user.id}:`, profileError?.message || "no row");
      return NextResponse.json(
        { error: "Your account profile could not be found. Please sign in again." },
        { status: 404 }
      );
    }

    const balance = Number(profile.balance_inr);
    const cost = CREDIT_PRICE_INR;
    const availableCredits = creditsFromBalance(balance);

    // Check balance (1 credit = 1 generation)
    if (balance < cost) {
      return NextResponse.json({
        error: `Insufficient credits. Required: 1.0 Credit, Available: ${availableCredits.toFixed(1)} Credits. Please add credits to your account.`
      }, { status: 403 });
    }

    // Check Fal API key: without it nothing can be generated, and we must never
    // hand back a stock placeholder image while still taking the user's money.
    if (!falKey) {
      return serviceUnavailable("missing FAL_KEY environment configuration");
    }

    // 3. Compress All Garment Reference Images Directly (Max MAX_GARMENT_REFERENCES, <= 640px)
    // Per-item fault tolerance: one unreachable garment must not abort the whole
    // generation. Transient failures get retried; a permanent failure drops that
    // garment and is reported back so the client knows what was skipped.
    interface PreparedGarment {
      url: string;
      note: string;
      slotLabel: string;
    }
    const garmentFailures: string[] = [];
    const preparedGarments: PreparedGarment[] = (
      await Promise.all(
        activeGarments.map(async (g, idx): Promise<PreparedGarment | null> => {
          try {
            const url = await retryOperation(() => getCompressedFalUrl(g.url, 640), 2, 1000);
            return { url, note: g.note || "", slotLabel: g.slotLabel || "Garment" };
          } catch (err) {
            const reason = err instanceof Error ? err.message : "unknown error";
            console.error(`Garment reference ${idx + 1} failed to prepare:`, reason);
            garmentFailures.push(`Garment ${idx + 1}`);
            return null;
          }
        })
      )
    ).filter((g): g is PreparedGarment => g !== null);

    if (preparedGarments.length === 0) {
      return NextResponse.json(
        {
          error:
            "None of the provided fabric reference images could be loaded. Please re-upload them.",
          skippedGarments: garmentFailures,
        },
        { status: 400 }
      );
    }

    if (garmentFailures.length > 0) {
      console.warn(
        `Continuing with ${preparedGarments.length}/${activeGarments.length} garments; skipped: ${garmentFailures.join(", ")}`
      );
    }

    const compressedGarmentUrls = preparedGarments.map((g) => g.url);

    // 4. Formulate Multi-Image References and Professional FLUX 2 Pro Prompt
    let imageUrls: string[] = [];
    let fluxPrompt = "";

    if (mode === "magic") {
      // =========================================================================
      // MAGIC MODE (BETA) PIPELINE
      // Multi-Reference Mapping: [Pose Anchor, Face Anchor, Background Anchor, ...Garments]
      // (Max MAX_TOTAL_REFERENCES overall, MAX_GARMENT_REFERENCES garments)
      // =========================================================================
      interface RefEntry {
        url: string;
        type: "pose" | "face" | "background" | "garment";
        index: number;
        note?: string;
        slotLabel?: string;
      }
      const refList: RefEntry[] = [];

      // Every non-garment reference is optional: a stale URL drops that one
      // layer (with a server log) instead of failing the whole request.
      const prepareOptionalRef = async (
        url: string,
        label: string
      ): Promise<string | null> => {
        try {
          return await retryOperation(() => getCompressedFalUrl(url, 640), 2, 1000);
        } catch (err) {
          console.error(`${label} reference could not be prepared and was skipped:`,
            err instanceof Error ? err.message : err);
          return null;
        }
      };

      // Slot A: Pose Reference Image (if not custom text pose)
      if (poseImageUrl && poseId !== "custom") {
        const compressedPose = await prepareOptionalRef(poseImageUrl, "Pose");
        if (compressedPose) {
          refList.push({ url: compressedPose, type: "pose", index: refList.length + 1 });
        }
      }

      // Slot B: Brand Custom Model Face (if provided)
      const rawFace = customFaceUrl || (faceMode === "custom_face" ? modelFaceUrl : null);
      if (rawFace) {
        const compressedFace = await prepareOptionalRef(rawFace, "Face");
        if (compressedFace) {
          refList.push({ url: compressedFace, type: "face", index: refList.length + 1 });
        }
      }

      // Slot C: Background Reference Image (if provided and not custom text)
      if (
        backgroundUrl &&
        backgroundId !== "custom" &&
        backgroundUrl !== poseImageUrl
      ) {
        const compressedBg = await prepareOptionalRef(backgroundUrl, "Background");
        if (compressedBg) {
          refList.push({ url: compressedBg, type: "background", index: refList.length + 1 });
        }
      }

      // Slot D: Product Garment Fabrics (up to MAX_GARMENT_REFERENCES, within MAX_TOTAL_REFERENCES total)
      const garmentIndices: number[] = [];
      for (const garment of preparedGarments) {
        if (refList.length >= MAX_TOTAL_REFERENCES || !garment.url) break;
        const idx = refList.length + 1;
        refList.push({
          url: garment.url,
          type: "garment",
          index: idx,
          note: garment.note,
          slotLabel: garment.slotLabel,
        });
        garmentIndices.push(idx);
      }

      imageUrls = refList.map(r => r.url);

      const poseRef = refList.find(r => r.type === "pose");
      const faceRef = refList.find(r => r.type === "face");
      const bgRef = refList.find(r => r.type === "background");

      // Layer notes numbered by the SAME @imageN index used in the prompt.
      const notesSummary = refList
        .filter((r) => r.type === "garment" && r.note)
        .map((r) => `@image${r.index} (${r.slotLabel}): ${r.note}`)
        .join("; ");


      // Fabric Handling (Default: Auto-Detect from garment photo, User choice is optional override)
      const isAutoDetectFabric =
        !fabric ||
        fabric.toLowerCase().includes("auto-detect") ||
        fabric.toLowerCase().includes("wholesale saree fabric") ||
        fabric.toLowerCase().includes("default");

      const fabricTitleDescriptor = isAutoDetectFabric ? "" : `${fabric} `;

      const fabricDirective = isAutoDetectFabric
        ? `AUTOMATIC FABRIC & TEXTILE DETECTION (DEFAULT MANDATE): Flux 2 Pro must closely analyze and identify the exact authentic fabric material, textile weave density, yarn thread sheen, weight, and drape physics directly from the uploaded garment reference photo(s). Accurately replicate its authentic physical material composition (e.g. pure silk, raw silk, tussar, banarasi brocade, organza, georgette, chiffon, cotton, linen, velvet, satin, or tissue) as captured in the photo. Faithfully simulate its exact tactile texture, realistic surface light reflection/luster (matte, subtle sheen, or luminous silk luster), thread slubs, zari border relief, and true physical drape gravity and pleat folding as dictated by the detected fabric.`
        : `SPECIFIED FABRIC OVERRIDE: The user has tailored the fabric weave to ${fabric}${fabricDescription ? ` (${fabricDescription})` : ""}. Drapery physics & tactile texture: ${fabricDrapePhysics || fabric}. Mirror this weave density, thread grain, and surface reflection authentically while keeping all patterns, prints, and colors true to the reference photos.`;

      const promptParts: string[] = [
        `High-end luxury Indian fashion catalog editorial photograph of a gorgeous ${modelName || "Indian fashion model"} showcasing a bespoke ${fabricTitleDescriptor}${outfitType || "ethnic outfit"}.`
      ];

      // Model Face
      if (faceRef) {
        promptParts.push(
          `Model Face Identity: Transfer the exact facial features, facial structure, eye shape, radiant skin tone, and expression from @image${faceRef.index} onto the model.`
        );
      } else {
        promptParts.push(
          `Model Characteristics: Beautiful Indian woman with natural radiant skin, refined features, and a confident elegant catalog expression.`
        );
      }

      // Pose
      if (poseRef) {
        promptParts.push(
          `Pose & Body Posture: Extract and replicate the exact physical human body posture, limb angles, hand gesture, and stance from @image${poseRef.index} (${poseName}${poseDescription ? `: ${poseDescription}` : ""}). ` +
          `MANDATORY POSE EXTRACTION DIRECTIVE (DISCARD POSE BACKGROUND & CASUAL CLOTHING): Extract ONLY the human skeletal posture and body positioning from @image${poseRef.index}. COMPLETELY IGNORE, DISCARD, AND STRIP AWAY the grey studio wall, studio floor, and Western clothing from @image${poseRef.index}. Do NOT reproduce, leak, or blend any aspect of the studio setting or casual clothes from @image${poseRef.index} into the output.`
        );
      } else if (poseDescription) {
        promptParts.push(
          `Pose & Posture: Direct the model in the custom pose: ${poseDescription}.`
        );
      } else {
        promptParts.push(`Pose: Elegant natural standing pose with graceful hand placement.`);
      }

      // Background & Physical Environmental Integration
      if (bgRef) {
        promptParts.push(
          `Background & Scene Integration: Place the model directly inside the authentic three-dimensional physical environment and architectural setting from @image${bgRef.index} (${backgroundName}${backgroundDescription ? `: ${backgroundDescription}` : ""}). ` +
          `Replicate the exact walls, flooring, lighting direction, ambient color temperature, and spatial geometry of @image${bgRef.index}. ` +
          `CRITICAL SHARP BACKGROUND (ZERO BLUR): Deep depth of field, f/8 to f/11 aperture, zero background blur, zero blurry backdrop, zero shallow depth of field, zero artificial bokeh. The entire background environment from @image${bgRef.index} must be crisp, tack-sharp, and completely in focus throughout the depth of the frame. ` +
          `PHYSICAL GROUNDING & LIGHTING BOUNCE: The model must be realistically grounded and physically positioned inside @image${bgRef.index}. Her feet and garment hem must rest naturally on the floor with authentic soft contact shadows and ambient occlusion. Synchronize lighting direction, shadow angles, and ambient color temperature so the background light naturally wraps around and reflects onto her skin, hair, and draped outfit. Authentic in-camera editorial look, seamless spatial perspective, zero cutout effect, no floating model.`
        );
      } else if (backgroundDescription) {
        promptParts.push(
          `Background & Setting: High-end architectural catalog setting: ${backgroundDescription}. Sharp in-focus background with zero blur, deep f/8 aperture, realistic physical grounding with authentic floor contact shadows, and seamless ambient lighting integration.`
        );
      }

      // Hairstyle & Jewellery
      if (hairstyle && hairstyle !== "Default (as before)") {
        promptParts.push(`Hairstyle: ${hairstyle}${hairstyleDescription ? ` (${hairstyleDescription})` : ""}, polished salon finish.`);
      } else {
        promptParts.push(`Hairstyle: Elegant signature catalog styling.`);
      }

      if (jewellery && jewellery !== "Default (as before)") {
        promptParts.push(`Jewellery: Adorned with fine ${jewellery}${jewelleryDescription ? ` (${jewelleryDescription})` : ""}, catching ambient light highlights.`);
      } else {
        promptParts.push(`Jewellery: Harmonized fine ethnic gold bangles and delicate earrings.`);
      }

      // Garment & Draping
      if (garmentIndices.length > 0) {
        const garmentTokens = garmentIndices.map(i => `@image${i}`).join(", ");
        promptParts.push(
          `Product Garment Draping: Drape the authentic ${fabricTitleDescriptor}ethnic outfit from ${garmentTokens} directly onto the model.`,
          fabricDirective
        );
      }

      if (notesSummary) {
        promptParts.push(`Product layer notes & specifications: ${notesSummary}.`);
      }

      if (customNotes) {
        promptParts.push(`Styling & drape instructions: ${customNotes}.`);
      }

      // Quality, Skin Realism & Deep Focus Photography
      promptParts.push(
        `Photographic Realism & Deep Focus: Shot on medium format camera at f/8 aperture with edge-to-edge sharpness across both the model and the entire background environment. No artificial background blurring, no shallow depth of field blur, crisp architectural textures. Authentic raw human skin texture with natural micro-pores and fine skin grain, soft matte non-glossy finish without waxy smoothness. Authentic textile weave with crisp warp and weft threads, natural zari embroidery relief, and realistic fabric gravity drape. Natural human anatomy with slender five-finger hands, Hasselblad editorial catalog lighting, 8k resolution, photorealistic master lookbook.`
      );

      fluxPrompt = promptParts.filter(Boolean).join(" ");

    } else {
      // =========================================================================
      // STUDIO LOOKBOOKS (WHOLESALE SAREES / MASTER SHOOTS) PIPELINE
      // Zero Hallucination Anchor: [Shoot Reference, Face Reference (opt), ...Garments]
      // =========================================================================
      const rawShootUrl = shootImageUrl || "/reference_shoots/garden_01_morning_sun.jpg";
      const compressedShootUrl = await getCompressedFalUrl(rawShootUrl, 640);

      // Layer notes must carry the SAME @imageN numbering as garmentTokens,
      // which depends on how many anchors precede the garments in this branch.
      const buildGarmentNotes = (firstGarmentIndex: number): string =>
        preparedGarments
          .slice(0, MAX_GARMENT_REFERENCES)
          .map((g, i) => (g.note ? `@image${firstGarmentIndex + i} (${g.slotLabel}): ${g.note}` : ""))
          .filter(Boolean)
          .join("; ");

      const isAutoDetectFabric =
        !fabric ||
        fabric.toLowerCase().includes("auto-detect") ||
        fabric.toLowerCase().includes("wholesale saree fabric") ||
        fabric.toLowerCase().includes("default");

      const fabricTitleDescriptor = isAutoDetectFabric ? "" : `${fabric} `;

      const fabricDirective = isAutoDetectFabric
        ? `AUTOMATIC FABRIC & TEXTILE DETECTION (DEFAULT MANDATE): Flux 2 Pro must closely analyze and identify the exact authentic fabric material, textile weave density, yarn thread sheen, weight, and drape physics directly from the uploaded garment reference photo(s). Accurately replicate its authentic physical material composition (e.g. pure silk, raw silk, tussar, banarasi brocade, organza, georgette, chiffon, cotton, linen, velvet, satin, or tissue) as captured in the photo. Faithfully simulate its exact tactile texture, realistic surface light reflection/luster (matte, subtle sheen, or luminous silk luster), thread slubs, zari border relief, and true physical drape gravity and pleat folding as dictated by the detected fabric.`
        : `SPECIFIED FABRIC OVERRIDE: The user has tailored the fabric weave to ${fabric}${fabricDescription ? ` (${fabricDescription})` : ""}. Drapery physics & tactile texture: ${fabricDrapePhysics || fabric}. Mirror this weave density, thread grain, and surface reflection authentically while keeping all patterns, prints, and colors true to the reference photos.`;

      const studioFaceUrl = customFaceUrl || modelFaceUrl;
      if (faceMode === "custom_face" && studioFaceUrl) {
        // CUSTOM FACE MODE:
        // Image 1: Brand Model Face
        // Image 2: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
        // Images 3+: Product Garment Fabrics
        const compressedFaceUrl = await getCompressedFalUrl(studioFaceUrl, 640);
        const gUrls = compressedGarmentUrls.slice(0, MAX_GARMENT_REFERENCES);
        imageUrls = [compressedFaceUrl, compressedShootUrl, ...gUrls];

        const garmentTokens = gUrls.map((_, i) => `@image${3 + i}`).join(", ");
        const studioNotes = buildGarmentNotes(3);

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial portrait photograph with deep depth of field.`,
          `Facial Identity Transfer: Transfer the exact facial identity, features, and expression of the model in @image1 onto the model in @image2.`,
          `Preserve Pose & Sharp Environmental Setting: Preserve the exact body posture, natural hand anatomy, lighting direction, and background environment from @image2 (${shootTitle}: ${shootSetting || backgroundName}).`,
          `CRITICAL SHARP IN-FOCUS BACKGROUND & GROUNDING: The entire background setting and architecture from @image2 must remain sharp, clear, and fully in focus (deep f/8 aperture, zero background blur, zero shallow focus, zero artificial bokeh). The model must appear realistically integrated and physically grounded inside the space, casting authentic soft contact shadows onto the floor/ground, with ambient light from the surroundings naturally illuminating her skin and outfit.`,
          `Garment Draping: Drape the model in the authentic ${fabricTitleDescriptor}ethnic garment from ${garmentTokens} (${outfitType}).`,
          fabricDirective,
          studioNotes ? `Product specifications & layer notes: ${studioNotes}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, tactile weave texture, and authentic pleats/pallu drape directly onto the outfit.`,
          `Hyper-realistic natural skin micro-pores, matte non-glossy skin finish, un-airbrushed raw texture, realistic slender hand anatomy, tactile garment weave grain with true physical drape gravity, sharp edge-to-edge catalog lighting, 8k resolution master lookbook.`
        ].filter(Boolean).join(" ");

      } else if (faceMode === "random_face") {
        // DIVERSE INDIAN FACE MODE:
        // Image 1: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
        // Images 2+: Product Garment Fabrics
        const gUrls = compressedGarmentUrls.slice(0, MAX_GARMENT_REFERENCES);
        imageUrls = [compressedShootUrl, ...gUrls];

        const garmentTokens = gUrls.map((_, i) => `@image${2 + i}`).join(", ");
        const studioNotes = buildGarmentNotes(2);

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial photograph of a stunning, elegant Indian woman model with natural authentic features, non-glossy matte skin, and a warm confident expression.`,
          `Preserve Pose & Sharp Environmental Setting: Preserve the exact body pose, posture, natural five-finger hand anatomy, and background setting from @image1 (${shootTitle}: ${shootSetting || backgroundName}).`,
          `CRITICAL SHARP IN-FOCUS BACKGROUND & GROUNDING: The background environment and architecture from @image1 must remain crisp, tack-sharp, and completely in focus (deep f/8 focus, zero background blur, zero shallow depth of field, zero artificial bokeh). The model must appear realistically present and physically grounded inside the scene, casting natural soft contact shadows onto the floor, with matching ambient light bounce and perspective.`,
          `Garment Draping: Replace her outfit completely with the authentic ${fabricTitleDescriptor}ethnic garment from ${garmentTokens} (${outfitType}).`,
          fabricDirective,
          studioNotes ? `Product specifications: ${studioNotes}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, yarn weave texture, and authentic drape directly onto her outfit.`,
          `Hyper-realistic human skin with visible fine pores and subtle natural grain (no waxy or plastic airbrushing), realistic slender hands and fingers with gold bangles, tactile textile weave with authentic physical drape physics, sharp edge-to-edge catalog lighting, 8k resolution master lookbook.`
        ].filter(Boolean).join(" ");

      } else {
        // KEEP ORIGINAL SHOOT FACE (FLAGSHIP ZERO HALLUCINATION):
        // Image 1: Master Photoshoot Reference (Model Face + Pose + Hands + Lighting + Setting)
        // Images 2+: Product Garment Fabrics
        const gUrls = compressedGarmentUrls.slice(0, MAX_GARMENT_REFERENCES);
        imageUrls = [compressedShootUrl, ...gUrls];

        const garmentTokens = gUrls.map((_, i) => `@image${2 + i}`).join(", ");
        const studioNotes = buildGarmentNotes(2);

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial photograph of the exact model from @image1 wearing the authentic ${fabricTitleDescriptor}ethnic garment from ${garmentTokens} (${outfitType}).`,
          `Crucial Zero-Hallucination Mandate: Preserve the exact model's facial features, facial identity, warm natural smile, natural skin texture, hair, hand anatomy, posture, pose, and background environment exactly as shown in @image1 (${shootTitle}).`,
          `CRITICAL SHARP IN-FOCUS BACKGROUND & GROUNDING: The background setting, architecture, and environment from @image1 must remain completely in focus and tack-sharp (deep f/8 aperture, zero background blur, zero blurry backdrop, zero artificial bokeh). The model must be realistically grounded and physically positioned inside the scene, with authentic contact shadows on the floor/ground and seamless environmental lighting bounce matching the space.`,
          `Replace her outfit completely with the authentic ${fabricTitleDescriptor}ethnic garment shown in ${garmentTokens}.`,
          fabricDirective,
          studioNotes ? `Product specifications & layer notes: ${studioNotes}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, tactile thread weave texture, and pallu drape directly onto the draped outfit.`,
          `Hyper-realistic natural skin with subtle pores and matte finish (non-glossy, non-waxy, raw photographic realism), realistic slender hands and fingers, tangible fabric thread grain with physical drape and pleat gravity, sharp studio editorial lighting with full scene depth, 8k resolution master lookbook.`
        ].filter(Boolean).join(" ");
      }
    }

    // Strict Native 4.5 MP - 5.0 MP Target Dimension Calculations (Multiples of 16 for latent stability)
    let dimensions = { width: 1920, height: 2400 }; // 4:5 Editorial Portrait (4,608,000 pixels = ~4.61 MP)

    if (aspectRatio === "3:4") {
      dimensions = { width: 1872, height: 2496 }; // 3:4 Catalog Portrait (4,672,512 pixels = ~4.67 MP)
    } else if (aspectRatio === "9:16") {
      dimensions = { width: 1632, height: 2896 }; // 9:16 Full Length Runway (4,726,272 pixels = ~4.73 MP)
    } else if (aspectRatio === "1:1") {
      dimensions = { width: 2160, height: 2160 }; // 1:1 High-Res Square (4,665,600 pixels = ~4.67 MP)
    }

    console.log(`DEBUG: Calling fal-ai/flux-2-pro/edit (FaceMode: ${faceMode}, References: ${imageUrls.length}, Output Target: ${dimensions.width}x${dimensions.height} = ${((dimensions.width * dimensions.height) / 1e6).toFixed(2)} MP)`);

    // 5. Execute Fal.ai FLUX 2 Pro Multi-Image Edit Pipeline (Native 4.5MP-5.0MP Ultra-Sharp Asset)
    // Bounded by a global concurrency gate and a hard per-run timeout. If Fal
    // fails we return 503 WITHOUT touching the wallet: money is only ever taken
    // after an image actually exists.
    lastRunStartedAt.set(user.id, Date.now());
    await acquireFalSlot();

    let falResult: FalRunResult;
    try {
      falResult = await retryOperation(async () => {
        return await fal.run("fal-ai/flux-2-pro/edit", {
          input: {
            image_urls: imageUrls,
            prompt: fluxPrompt,
            image_size: dimensions,
            output_format: "png",
            safety_tolerance: "2"
          },
          abortSignal: AbortSignal.timeout(FAL_RUN_TIMEOUT_MS)
        });
      }, 2, 3000);
    } catch (falErr) {
      console.warn("Outbound Fal.ai call failed after retries:", falErr);
      return serviceUnavailable("fal inference failed");
    } finally {
      releaseFalSlot();
    }

    const imgObj = falResult?.data?.images?.[0] || falResult?.images?.[0];
    const generatedImageUrl =
      imgObj?.url ||
      falResult?.data?.image?.url ||
      falResult?.image?.url;

    if (!generatedImageUrl) {
      console.warn("No direct image URL from Fal result:", falResult);
      return serviceUnavailable("no image returned by Fal engine");
    }

    const actualWidth = imgObj?.width || dimensions.width;
    const actualHeight = imgObj?.height || dimensions.height;
    const actualMP = ((actualWidth * actualHeight) / 1000000).toFixed(2);
    console.log(`DEBUG: Fal.ai FLUX 2 Pro generation successful. Resolution: ${actualWidth}x${actualHeight} (${actualMP} MP).`);

    // 6. Deduct balance and log generation atomically in Supabase.
    // p_idempotency_key makes a client retry of the same logical request safe.
    let rpcResult: { data: unknown; error: { message: string } | null };
    try {
      rpcResult = await withTimeout(
        Promise.resolve(supabase.rpc("deduct_balance_for_generation", {
          p_cost: cost,
          p_prompt: mode === "magic"
            ? `CUSTOM LOOKBOOK: ${outfitType} | Pose: ${poseName} | Setting: ${backgroundName}`
            : `STUDIO LOOKBOOK: ${shootTitle} | Face: ${faceMode} | Setting: ${shootSetting || backgroundName}`,
          p_garment_url: activeGarments.map(g => g.url).join(","),
          p_face_url: customFaceUrl || modelFaceUrl || null,
          p_output_url: generatedImageUrl,
          p_idempotency_key: idempotencyKey ?? null
        })),
        RPC_TIMEOUT_MS,
        "billing transaction"
      );
    } catch (rpcErr) {
      console.error("Billing RPC timed out or failed:", rpcErr);
      return NextResponse.json(
        { error: "Your generation finished but could not be finalised. Please contact support — you were not charged twice." },
        { status: 500 }
      );
    }

    if (rpcResult.error) {
      // Raw DB/PostgREST text stays in the logs; the client gets a mapped message.
      console.error("Billing RPC rejected:", rpcResult.error.message);
      if (rpcResult.error.message.includes("Insufficient balance")) {
        return NextResponse.json(
          { error: "Insufficient credits. Please add credits to your account." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Your generation finished but could not be charged/recorded. Please try again." },
        { status: 500 }
      );
    }

    const newBalNum = Number(rpcResult.data);
    const remCredits = creditsFromBalance(newBalNum);

    // 7. Archiving to Cloudinary runs AFTER the response via next/server's
    // after(): the runtime is guaranteed to keep the request alive for it,
    // unlike a floating promise that serverless can freeze mid-flight.
    if (cloudinaryConfigured) {
      after(async () => {
        try {
          const uploaded = await withTimeout(
            cloudinary.uploader.upload(generatedImageUrl, { folder: "florus-lookbooks" }),
            30_000,
            "cloudinary archive"
          );
          console.log("DEBUG: Cloudinary archiving complete:", uploaded.secure_url);
        } catch (cloudErr) {
          console.warn("Cloudinary archiving notice:", cloudErr instanceof Error ? cloudErr.message : cloudErr);
        }
      });
    }

    // 8. Return native 4MP ultra-sharp lookbook immediately to the user
    return NextResponse.json({
      success: true,
      outputUrl: generatedImageUrl,
      // No fake LQIP: a real blur placeholder would mean downloading the whole
      // image a second time, so we return null and let the preview render the
      // final asset directly.
      blurPlaceholderUrl: null,
      cost,
      creditsCost: 1,
      newBalance: newBalNum,
      remainingCredits: remCredits,
      simulated: false
    });

  } catch (error) {
    // Only messages explicitly marked client-safe are echoed back, with THEIR
    // status code. Anything else (filesystem paths, raw upstream errors, stack
    // text) is replaced, while the full detail stays in the server logs.
    if (error instanceof ClientSafeError) {
      console.error(`Client-safe failure (${error.status}): ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Generation API internal error:", error);
    return NextResponse.json(
      { error: "Image generation failed due to an internal error. Please try again." },
      { status: 500 }
    );
  }
}

// Give the paid pipeline room to finish on serverless hosts that support it
// (ignored elsewhere). The Fal call itself is bounded by FAL_RUN_TIMEOUT_MS.
export const maxDuration = 300;
