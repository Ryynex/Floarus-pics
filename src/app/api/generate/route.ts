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
import { STAGING_TEMPLATES } from "@/lib/flatlayData";

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
const VALID_MODES = new Set(["sarees", "magic", "flatlay"]);
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

      // Category & Suit specific directives
      stagingTemplateUrl: rawStagingTemplateUrl = "/reference_suits/dark-teak.jpg",
      stagingTemplateName: rawStagingTemplateName = "Dark teak",
      category: rawCategory = "saree",
      suitSilhouette: rawSuitSilhouette = "Straight Cut Kurta Set",
      dupattaDrape: rawDupattaDrape = "Pinned on One Shoulder",
      necklineCut: rawNecklineCut = "Round Neck with Slit (Signature)",
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
    const stagingTemplateUrl = clampText(rawStagingTemplateUrl, 8000, "/reference_suits/dark-teak.jpg");
    const stagingTemplateName = clampText(rawStagingTemplateName, 200, "Dark teak");
    const category = typeof rawCategory === "string" && rawCategory === "suits" ? "suits" : "saree";
    const suitSilhouette = clampText(rawSuitSilhouette, 200, "Straight Cut Kurta Set");
    const dupattaDrape = clampText(rawDupattaDrape, 200, "Pinned on One Shoulder");
    const necklineCut = clampText(rawNecklineCut, 200, "Round Neck with Slit (Signature)");
    const outfitType = clampText(rawOutfitType, 200, category === "suits" ? "Unstitched Suit Set" : "Wholesale Saree (6-Yard)");
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
    const drapingStyle = clampText((body as any).drapingStyle, 200, "Default drape");
    const blouseStyle = clampText((body as any).blouseStyle, 200, "Auto-coordinate with border & zari (Default)");

    interface GarmentItem {
      url: string;
      note?: string;
      slotId?: string;
      slotLabel?: string;
      role?: string;
    }

    const rawGarmentList: unknown[] = Array.isArray(garments) ? (garments as unknown[]) : [];
    const rawGarments: GarmentItem[] = rawGarmentList
      .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === "object")
      .map((g) => ({
        url: typeof g.url === "string" ? g.url.trim().slice(0, MAX_BODY_BYTES) : "",
        note: typeof g.note === "string" ? clampText(g.note, 400, "") : "",
        slotId: typeof g.slotId === "string" ? clampText(g.slotId, 60, "") : undefined,
        slotLabel: typeof g.slotLabel === "string" ? clampText(g.slotLabel, 60, "") : undefined,
        role: typeof g.role === "string" ? clampText(g.role, 60, "") : undefined,
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
      role?: string;
    }
    const garmentFailures: string[] = [];
    const preparedGarments: PreparedGarment[] = (
      await Promise.all(
        activeGarments.map(async (g, idx): Promise<PreparedGarment | null> => {
          try {
            const url = await retryOperation(() => getCompressedFalUrl(g.url, 640), 2, 1000);
            return {
              url,
              note: g.note || "",
              slotLabel: g.slotLabel || "Garment",
              role: g.role,
            };
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
      // MAGIC MODE (CUSTOM LOOKBOOK) PIPELINE
      //
      // fal-ai/flux-2-pro/edit is an EDIT model: image_urls[0] is the primary
      // anchor that gets transformed, and the later images are references
      // ("the person from image 1 wearing the outfit from image 2" per fal/BFL
      // docs). The order is therefore fixed by ROLE, never by availability:
      //   [Face (identity anchor, when present), Pose, Background, ...Garments]
      // (Max MAX_TOTAL_REFERENCES overall, MAX_GARMENT_REFERENCES garments)
      // =========================================================================
      interface RefEntry {
        url: string;
        type: "pose" | "face" | "background" | "garment";
        index: number;
        note?: string;
        slotLabel?: string;
        role?: string;
      }
      const refList: RefEntry[] = [];

      // A reference the user explicitly selected (brand face, pose, background)
      // MUST be usable: silently dropping it changes the edit semantics and
      // bills a generation that ignores their choice. Failing here happens
      // BEFORE fal.run and before any charge.
      const prepareRequiredRef = async (
        url: string,
        label: string
      ): Promise<string> => {
        try {
          return await retryOperation(() => getCompressedFalUrl(url, 640), 2, 1000);
        } catch (err) {
          console.error(
            `${label} reference could not be prepared:`,
            err instanceof Error ? err.message : err
          );
          throw new ClientSafeError(
            `The ${label.toLowerCase()} reference could not be loaded. Please try again — you were not charged.`,
            502,
            true
          );
        }
      };

      // Slot 1 (optional): Brand Custom Model Face — the identity anchor.
      // Without it the pose photo carries a stranger's face, so the prompt
      // below switches to an explicit identity-replacement directive.
      const rawFace = customFaceUrl || (faceMode === "custom_face" ? modelFaceUrl : null);
      if (rawFace) {
        refList.push({
          url: await prepareRequiredRef(rawFace, "Face"),
          type: "face",
          index: refList.length + 1,
        });
      }

      // Slot 2 (when a reference pose was chosen): skeletal posture anchor.
      // A custom text pose intentionally sends no image.
      if (poseImageUrl && poseId !== "custom") {
        refList.push({
          url: await prepareRequiredRef(poseImageUrl, "Pose"),
          type: "pose",
          index: refList.length + 1,
        });
      }

      // Slot 3 (when a reference background was chosen): environment anchor.
      if (
        backgroundUrl &&
        backgroundId !== "custom" &&
        backgroundUrl !== poseImageUrl
      ) {
        refList.push({
          url: await prepareRequiredRef(backgroundUrl, "Background"),
          type: "background",
          index: refList.length + 1,
        });
      }

      // Slot 4+: Product garment fabrics. Unlike the creative anchors above,
      // garments keep partial tolerance (a stale upload drops just that layer;
      // failing on all of them was already rejected earlier).
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
          role: garment.role,
        });
        garmentIndices.push(idx);
      }

      imageUrls = refList.map(r => r.url);

      const poseRef = refList.find(r => r.type === "pose");
      const faceRef = refList.find(r => r.type === "face");
      const bgRef = refList.find(r => r.type === "background");

      // Every @imageN token in the prompt below is derived from this mapping,
      // so the prompt and the array can never drift apart. Logged for support.
      console.log(
        `DEBUG: Magic refs -> ${refList.map(r => `@image${r.index}=${r.type}`).join(", ") || "(none)"}`
      );

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


      const isSuitMode = category === "suits" || outfitType.toLowerCase().includes("suit") || outfitType.toLowerCase().includes("kurta");

      const promptParts: string[] = [
        bgRef
          ? `High-end luxury Indian fashion catalog editorial photograph captured entirely in-camera on location inside the authentic environment of @image${bgRef.index}, featuring a gorgeous ${modelName || "Indian fashion model"} showcasing a bespoke ${fabricTitleDescriptor}${outfitType || (isSuitMode ? "unstitched designer suit set" : "wholesale saree")}.`
          : `High-end luxury Indian fashion catalog editorial photograph of a gorgeous ${modelName || "Indian fashion model"} showcasing a bespoke ${fabricTitleDescriptor}${outfitType || (isSuitMode ? "unstitched designer suit set" : "wholesale saree")}.`
      ];

      // Identity. flux-2-pro/edit transforms its FIRST image, so this section
      // must match what occupies that slot:
      //  - brand face present  -> face is the anchor; build the body around it
      //  - no brand face       -> the pose photo carries a stranger's face, so
      //    her identity must be explicitly replaced (pose woman would otherwise
      //    dominate the output — the model cannot un-see a face in the base)
      if (faceRef) {
        promptParts.push(
          `Identity & Facial Realism: The person in @image${faceRef.index} is the ONLY facial identity for this lookbook. Preserve her exact bone structure, facial contours, almond eye shape, nose bridge, lip fullness, skin undertone, and warm expression with zero drift. ` +
          `LIFELIKE FACIAL DETAILING & RAW HUMAN SKIN: Render the face with ultra-high-definition lifelike human realism. Authentic skin micro-texture showing real skin pores, fine natural epidermal grain, delicate subtle laugh lines, and soft natural subsurface scattering (translucent real skin). Expressive, living eyes with clear corneal light reflection (catchlights), detailed iris texture, individual upper and lower eyelashes, and natural eyebrow hair definition. Natural lip texture with subtle moisture and fine natural creases. Absolutely ZERO plastic airbrushing, ZERO waxy AI smoothing, ZERO blurred skin filters, and ZERO doll-like artificial smoothness. She must look 100% like a real living human woman photographed in real life.`
        );
      } else if (poseRef) {
        promptParts.push(
          `IDENTITY REPLACEMENT & LIFELIKE FACIAL REALISM (MANDATORY): The woman visible in @image${poseRef.index} is a body-geometry stand-in only. REPLACE her face, hairstyle, and entire physical identity with a newly synthesized ${modelName || "Indian fashion model"}. ` +
          `LIFELIKE FACIAL DETAILING & RAW HUMAN SKIN: Render her face with photorealistic, breathtaking human realism: natural radiant skin with fine visible pores, natural epidermal texture, soft matte finish with subtle skin moisture, expressive lifelike eyes with realistic iris depth and catchlights, individual eyelashes and natural eyebrow hairs, and natural lip texture. Zero plastic airbrushing, zero waxy smoothing, zero artificial filters. RETAIN ONLY her skeletal posture, limb angles, and hand placement from @image${poseRef.index}. Do NOT retain, blend, or leak any facial features, hair, or identity from @image${poseRef.index} into the output.`
        );
      } else {
        promptParts.push(
          `Model Characteristics & Lifelike Facial Realism: Beautiful Indian woman (${modelName || "Indian fashion model"}) with stunning lifelike facial detailing: authentic skin texture with visible micro-pores, fine natural epidermal grain, natural subsurface light scattering, warm radiant eyes with detailed iris reflection and individual eyelashes, natural eyebrow hair definition, and soft matte non-plastic skin. Confident, elegant, authentic catalog expression.`
        );
      }

      // Pose
      if (poseRef && faceRef) {
        // Pose is a secondary reference (identity lives at image 1): pull the
        // body geometry only, never the scene or the person.
        promptParts.push(
          `Pose & Body Posture: Adopt the physical human body posture, limb angles, hand gesture, and stance from @image${poseRef.index}. ` +
          `Use @image${poseRef.index} strictly as a skeletal pose and hand-anatomy reference: do not reproduce its studio setting, its grey background, or its casual clothing, and do not adopt the identity of the person in it. ` +
          `MANDATORY SCALE & FRAMING DECOUPLING: Extract ONLY the skeletal posture and hand gestures from @image${poseRef.index}. Do NOT inherit or copy the tight studio cropping, close magnification, or canvas scaling from @image${poseRef.index}. Naturally position the model standing physically grounded inside @image${bgRef ? bgRef.index : "the environment"}.`
        );
      } else if (poseRef) {
        // Pose photo is the edit base: keep the strong discard directive.
        promptParts.push(
          `Pose & Body Posture: Extract and replicate the exact physical human body posture, limb angles, hand gesture, and stance from @image${poseRef.index}. ` +
          `MANDATORY POSE EXTRACTION DIRECTIVE (DISCARD POSE BACKGROUND & CASUAL CLOTHING): Extract ONLY the human skeletal posture and body positioning from @image${poseRef.index}. COMPLETELY IGNORE, DISCARD, AND STRIP AWAY the grey studio wall, studio floor, and Western clothing from @image${poseRef.index}. Do NOT reproduce, leak, or blend any aspect of the studio setting or casual clothes from @image${poseRef.index} into the output. ` +
          `MANDATORY SCALE & FRAMING DECOUPLING: Extract ONLY the skeletal posture and hand gestures from @image${poseRef.index}. Do NOT inherit or copy the tight studio cropping, close magnification, or canvas scaling from @image${poseRef.index}. Naturally position the model standing physically grounded inside @image${bgRef ? bgRef.index : "the environment"}.`
        );
      } else if (poseDescription) {
        promptParts.push(
          `Pose & Posture: Direct the model in the custom pose: ${poseDescription}.`
        );
      } else {
        promptParts.push(`Pose: Elegant natural standing pose with graceful hand placement.`);
      }

      // Background & Seamless On-Location Integration
      if (bgRef) {
        promptParts.push(
          `AUTHENTIC IN-CAMERA ON-LOCATION PHOTOGRAPHY (ZERO CUTOUT / ZERO GREEN-SCREEN EFFECT): This entire image is captured as a single, authentic photograph taken entirely in-camera on location in the real-world setting of @image${bgRef.index}. The model is physically present, standing directly inside this space. Completely remove and discard any studio backdrop, floor, or walls from other reference images. ` +
          `UNIFIED ENVIRONMENTAL LIGHTING & RADIOSITY BOUNCE: The natural sunlight direction, key lighting angle, and warm color temperature from @image${bgRef.index} must illuminate the model completely. The sun casts authentic directional highlights on her face, shoulders, hair, and draped outfit, with shadows falling in the exact same angle and softness as the architectural shadows in @image${bgRef.index}. The surrounding stone walls and floor plane must bounce warm ambient light onto her skin, chin, and lower fabric folds. Never light the model with mismatched studio flash. ` +
          `PHYSICAL GROUND CONTACT & CAST SHADOWS (ELIMINATE FLOATING): The model is firmly planted on the ground or floor surface of @image${bgRef.index}. Directly beneath her feet, sandals, and hemline, there must be dark, sharp contact ambient occlusion shadows physically anchoring her to the ground, accompanied by a realistic directional cast shadow stretching across the floor matching the angle, length, and softness of the shadows in @image${bgRef.index}. She must NEVER appear floating or pasted on top of the ground. ` +
          `ATMOSPHERIC EDGE WRAP & OPTICAL COHESION: The natural ambient light and air of @image${bgRef.index} wrap softly around her silhouette, shoulders, and individual hair strands (subtle optical edge light wrap), completely eliminating harsh cutout outlines, halos, or sticker effects. The camera lens optics, exposure, color grading, warm atmospheric tone, and sensor grain are 100% unified across both the model and the background. ` +
          `PROPORTIONAL HUMAN SCALE & ARCHITECTURAL GRANDEUR: The model possesses realistic, natural human stature (approx. 170 cm / 5'7") naturally proportioned within the architectural space of @image${bgRef.index}. Palace archways, carved pillars, doorways, and staircases retain their authentic grand real-world scale, towering naturally above the standing model. The model must NOT appear giant or oversized. ` +
          `EYE-LEVEL HORIZON & NATURAL EDITORIAL COMPOSITION: Shot at natural eye-level / chest-level elevation (approx. 1.5m) from a 4 to 5 meter distance (50mm–85mm lens perspective), aligned with the horizon and vanishing point of @image${bgRef.index}. The model stands comfortably in the foreground/midground with natural headroom above and grounded floor space below, never cropped edge-to-edge.`
        );
      } else if (backgroundDescription) {
        promptParts.push(
          `Background & Setting: High-end architectural catalog setting: ${backgroundDescription}. Sharp in-focus background with zero blur, deep f/8 aperture. ` +
          `REALISTIC HUMAN SCALE & EDITORIAL PROPORTION: The model must have realistic, natural human stature (170 cm / 5'7") correctly proportioned to the architectural surroundings (doors, arches, and walls towering realistically above the model, avoiding any oversized giant appearance). Natural editorial framing with comfortable headroom and floor breathing room, authentic ground contact shadows, directional sun matching scene shadows, and seamless ambient lighting integration.`
        );
      }

      // Hairstyle & Jewellery
      if (hairstyle && hairstyle !== "Default (as before)") {
        promptParts.push(`Hairstyle: ${hairstyle}, polished salon finish.`);
      } else {
        promptParts.push(`Hairstyle: Elegant signature catalog styling.`);
      }

      if (jewellery && jewellery !== "Default (as before)") {
        promptParts.push(`Jewellery: Adorned with fine ${jewellery}, catching ambient light highlights.`);
      } else {
        promptParts.push(`Jewellery: Harmonized fine ethnic gold bangles and delicate earrings.`);
      }

      // Garment & Tailoring / Draping
      if (garmentIndices.length > 0) {
        const garmentTokens = garmentIndices.map(i => `@image${i}`).join(", ");
        const fabricDirective = isAutoDetectFabric
          ? `MANDATORY FABRIC EXTRACTION: Extract and replicate the exact authentic fabric material, textile weave density, yarn thread sheen, and drape physics directly from ${garmentTokens}. Faithfully reproduce its exact tactile texture, surface luster, and true physical drape gravity and pleats as seen in ${garmentTokens}.`
          : `SPECIFIED FABRIC OVERRIDE: Fabric weave: ${fabric}. Drapery physics: ${fabricDrapePhysics || fabric}. Mirror this weave density and surface reflection while keeping all patterns, prints, and colors true to ${garmentTokens}.`;

        if (isSuitMode) {
          // =====================================================================
          // NON-SAREE GARMENTS & UNSTITCHED SUITS (AI AUTO-DETECT PIPELINE)
          // =====================================================================
          const kameezRef = refList.find(r => r.type === "garment" && (r.role === "kameez" || r.role === "kurta_top" || r.slotLabel?.toLowerCase().includes("kameez") || r.slotLabel?.toLowerCase().includes("kurta") || r.slotLabel?.toLowerCase().includes("top")));
          const chestRef = refList.find(r => r.type === "garment" && (r.role === "chest_design" || r.role === "neckline_detail" || r.slotLabel?.toLowerCase().includes("chest") || r.slotLabel?.toLowerCase().includes("neckline") || r.slotLabel?.toLowerCase().includes("detail")));
          const dupattaRef = refList.find(r => r.type === "garment" && (r.role === "dupatta" || r.slotLabel?.toLowerCase().includes("dupatta")));
          const bottomRef = refList.find(r => r.type === "garment" && (r.role === "bottom" || r.role === "salwar_bottom" || r.slotLabel?.toLowerCase().includes("salwar") || r.slotLabel?.toLowerCase().includes("bottom") || r.slotLabel?.toLowerCase().includes("pants")));
          const completeSetRef = refList.find(r => r.type === "garment" && (r.role === "complete_set" || r.slotLabel?.toLowerCase().includes("complete") || r.slotLabel?.toLowerCase().includes("ensemble")));

          const isAutoSilhouette = !suitSilhouette || suitSilhouette.includes("Auto-Detect") || suitSilhouette.includes("auto");
          const isAutoDrape = !dupattaDrape || dupattaDrape.includes("Auto-Coordinate") || dupattaDrape.includes("auto");

          promptParts.push(
            `MANDATORY NON-SAREE GARMENT SYNTHESIS & AUTO-DETECTION (STRICTLY NO SAREE / NO CHOLI): The model is wearing a fully tailored, bespoke designer ethnic outfit synthesized from the garment fabric references in ${garmentTokens}. ` +
            `AI AUTOMATIC GARMENT & SILHOUETTE DETECTION: Analyze the reference images (${garmentTokens}) to automatically identify and reconstruct the exact garment ensemble (such as a tailored Salwar Kameez, Pakistani Lawn Kurta Set, Flared Anarkali Suit, Sharara/Gharara, Kurti with Trousers, or Co-ord Set). ` +
            `Assemble and tailor the unstitched components directly onto the model with publication-grade bespoke tailoring. STRICTLY PROHIBIT 6-yard sarees, saree pleats, saree pallu drapes, and bare midriffs.`
          );

          if (completeSetRef) {
            promptParts.push(
              `COMPLETE ENSEMBLE MASTER TEMPLATE: Use @image${completeSetRef.index} as the master visual guide for the overall silhouette, cut proportions, sleeve length, hemline style, and styling coordination of the outfit.`
            );
          }

          if (kameezRef) {
            promptParts.push(
              `KAMEEZ / TOP FABRIC TAILORING: Cut and tailor the model's top/kameez directly from @image${kameezRef.index}. Faithfully transfer its exact base fabric color, woven motifs, digital prints, and daman hemline borders onto the garment.`
            );
          } else if (completeSetRef) {
            promptParts.push(
              `TOP / KURTA SPECIFICATION: Cut and tailor the top matching the garment shown in @image${completeSetRef.index}.`
            );
          }

          if (chestRef) {
            promptParts.push(
              `CHEST DESIGN & NECKLINE EMBROIDERY: Replicate the intricate neck embroidery, threadwork, gala patch, and zari detailing visible in @image${chestRef.index} precisely centered on the model's upper torso and neckline with needlework realism.`
            );
          }

          if (bottomRef) {
            promptParts.push(
              `BOTTOM / PANTS TAILORING: Tailor the matching bottom trousers (cigarette pants, salwar, or palazzo) directly from the fabric in @image${bottomRef.index}, cleanly fitted beneath the top.`
            );
          }

          if (dupattaRef) {
            const drapeStyle = isAutoDrape ? "graceful natural drape" : dupattaDrape;
            promptParts.push(
              `DUPATTA DRAPING: Style the authentic dupatta from @image${dupattaRef.index} in a ${drapeStyle}, faithfully displaying its borders, prints, and lightweight translucent fabric drape physics.`
            );
          }

          promptParts.push(fabricDirective);

        } else {
          // =====================================================================
          // WHOLESALE SAREE PIPELINE (6-YARD DRAPES & BLOUSE)
          // =====================================================================
          promptParts.push(
            `MANDATORY GARMENT & FABRIC EXTRACTION: Drape the authentic 6-yard ethnic saree from ${garmentTokens} directly onto the model. Transfer the exact intricate embroidery, zari borders, prints, motif placement, fabric colors, and pallu/pleat drape directly from ${garmentTokens} onto her outfit with 100% visual fidelity.`,
            fabricDirective
          );

          // Explicit Draping Style Directive
          if (drapingStyle && drapingStyle !== "Default drape") {
            promptParts.push(`Draping Style: Authentic ${drapingStyle} with clean graceful pleats and shoulder drape.`);
          }

          // Dedicated Blouse Requirement
          const blouseGarment = refList.find(
            (r) =>
              r.type === "garment" &&
              (r.slotLabel?.toLowerCase().includes("blouse") || (r as any).role === "blouse")
          );

          if (blouseGarment) {
            promptParts.push(
              `MANDATORY BLOUSE SPECIFICATION: The model MUST wear a fully tailored, beautifully fitted ethnic blouse (choli) crafted directly from @image${blouseGarment.index}. Faithfully transfer its exact fabric, color, neckline, and sleeves neatly fitted beneath the saree pallu drape. The blouse must be clearly visible, crisp, and properly structured around the torso and shoulders.`
            );
          } else {
            promptParts.push(
              `MANDATORY BLOUSE SPECIFICATION: The model MUST wear a tailored, elegant ethnic saree blouse (choli) properly fitted beneath the saree pallu drape (${blouseStyle || "tailored matching ethnic blouse"}). Coordinate its fabric color, sleeve cuffs, and neckline harmoniously with the saree border and zari accents. Never generate the model without a blouse or with an ambiguous bare chest drape.`
            );
          }

          const palluGarments = refList.filter(
            (r) =>
              r.type === "garment" &&
              (r.slotLabel?.toLowerCase().includes("pallu") ||
                r.slotLabel?.toLowerCase().includes("border") ||
                (r as any).role?.includes("pallu"))
          );
          if (palluGarments.length > 0) {
            const palluTokens = palluGarments.map((p) => `@image${p.index}`).join(" and ");
            promptParts.push(
              `MANDATORY PALLU & BORDER SPECIFICATION: Faithfully replicate the intricate zari embroidery, end-piece motifs, and decorative border detailing visible in ${palluTokens} across the flowing shoulder pallu drape and hemline.`
            );
          }
        }
      }

      if (notesSummary) {
        promptParts.push(`Product layer notes & specifications: ${notesSummary}.`);
      }

      if (customNotes) {
        promptParts.push(`Styling & drape instructions: ${customNotes}.`);
      }

      // Quality, Skin Realism & Deep Focus Photography
      promptParts.push(
        `Photographic Realism, Facial Clarity & Deep Focus: Shot on medium format camera with 50mm to 85mm full-length editorial lens at f/8 aperture with edge-to-edge sharpness across the model, face, and background environment. Extreme facial clarity with visible natural human skin pores, authentic fine skin texture, soft natural skin highlights, expressive living eyes with crisp catchlights, and photorealistic five-finger hand anatomy. Balanced full-length editorial composition with realistic human stature and harmonious spatial scale relative to the architecture. No artificial background blurring, no shallow depth of field blur, crisp architectural textures. Authentic raw human skin texture with natural micro-pores and fine skin grain, soft matte non-glossy finish without waxy smoothness. Authentic textile weave with crisp warp and weft threads, natural zari embroidery relief, and realistic fabric gravity drape. Hasselblad editorial catalog lighting, 8k resolution, photorealistic master lookbook.`
      );

      fluxPrompt = promptParts.filter(Boolean).join(" ");

    } else if (mode === "flatlay") {
      // =========================================================================
      // FLAT-LAY STUDIO (UNSTITCHED SUITS) PIPELINE
      // Zero Hallucination Anchor: [Staging Template, ...Garments]
      // =========================================================================
      const rawTemplateUrl = String(rawStagingTemplateUrl || "/reference_suits/dark-teak.jpg");
      const compressedTemplateUrl = await getCompressedFalUrl(rawTemplateUrl, 640);

      imageUrls = [compressedTemplateUrl, ...compressedGarmentUrls];

      const matchedTemplate =
        STAGING_TEMPLATES.find(
          (t) =>
            t.image === rawTemplateUrl ||
            t.id === rawTemplateUrl ||
            t.name.toLowerCase() === stagingTemplateName.toLowerCase() ||
            rawTemplateUrl.includes(t.id)
        ) || STAGING_TEMPLATES[0];

      const kameezIndex = preparedGarments.findIndex(
        (g) => g.role === "kameez" || g.slotLabel?.toLowerCase().includes("kameez")
      );
      const chestIndex = preparedGarments.findIndex(
        (g) => g.role === "chest_design" || g.slotLabel?.toLowerCase().includes("chest")
      );
      const dupattaIndex = preparedGarments.findIndex(
        (g) => g.role === "dupatta" || g.slotLabel?.toLowerCase().includes("dupatta")
      );
      const bottomIndex = preparedGarments.findIndex(
        (g) => g.role === "bottom" || g.slotLabel?.toLowerCase().includes("bottom")
      );
      const completeIndex = preparedGarments.findIndex(
        (g) => g.role === "complete_set" || g.slotLabel?.toLowerCase().includes("complete")
      );

      const isMannequin =
        matchedTemplate.category === "mannequin" ||
        matchedTemplate.name.toLowerCase().includes("mannequin");

      const promptParts: string[] = [
        `Commercial luxury e-commerce catalog photograph.`,
        `CRITICAL ZERO-HALLUCINATION STAGING TEMPLATE MANDATE: Preserve the exact staging surface, tabletop texture, background environment, and camera angle from @image1 (${matchedTemplate.surface} — ${matchedTemplate.description}) with 100% precision.`,
        `SURFACE & PROPS RETENTION MANDATE: The exact surface texture (${matchedTemplate.surface}), wood grain, marble veining, tiles, tabletop edge, lighting direction, and ALL styling props/accessories visible in @image1 (such as brass bowls, urli, marigold flower petals, books, magnifying glasses, dishes, or tassels) MUST BE PRESERVED IN PLACE as shown in @image1. Absolutely zero alteration to the background tabletop surface.`,
      ];

      if (isMannequin) {
        promptParts.push(
          `MANNEQUIN TAILORING MANDATE: Maintain the exact dressmaker mannequin torso form and stand from @image1. Tailor and drape the unstitched suit fabric components onto the mannequin form with bespoke couture tailoring. Strictly NO human head, NO human face, NO living model.`
        );
      } else {
        promptParts.push(
          `OVERHEAD FLAT-LAY PERSPECTIVE: Maintain the exact overhead flat-lay perspective, elevation, and framing from @image1. Strictly NO human models, NO human bodies, NO faces, NO hands, NO mannequins. Only neatly folded and artfully staged unstitched ethnic fabric pieces laid out on the surface.`
        );
      }

      // Garment Fabric Inpainting
      const garmentTokens = compressedGarmentUrls.map((_, i) => `@image${2 + i}`).join(", ");
      promptParts.push(
        `FABRIC INPAINTING & REPLACEMENT: Replace ONLY the folded ethnic garment fabrics arranged on @image1 with the authentic unstitched designer suit fabric pieces from ${garmentTokens}. Transfer their exact textile weave density, yarn sheen, fabric colors, and authentic prints/motifs directly onto the folded layout.`
      );

      if (compressedGarmentUrls.length === 1) {
        promptParts.push(
          `SUIT ENSEMBLE TRANSFER: The unstitched designer ethnic suit is completely crafted from @image2. Faithfully extract and transfer all colors, textile patterns, prints, woven motifs, daman borders, and fabric textures visible in @image2, arranging the suit fabric in the clean, elegant commercial flat-lay fold onto the staging surface of @image1.`
        );
      } else {
        if (kameezIndex >= 0) {
          promptParts.push(
            `KAMEEZ / KURTA FABRIC: The central folded unstitched kurta/kameez length is crafted directly from @image${kameezIndex + 2}. Faithfully transfer its exact base fabric color, woven motifs, digital prints, and daman hemline borders into the folded arrangement.`
          );
        } else {
          promptParts.push(
            `KAMEEZ FABRIC: Central folded ethnic kurta fabric reproducing the uploaded fabric color, weave texture, and border work.`
          );
        }

        if (chestIndex >= 0) {
          promptParts.push(
            `CHEST EMBROIDERY & GALA DETAIL: The intricate neckline embroidery, gala patch, needlework, and zari threadwork from @image${chestIndex + 2} is prominently showcased centered on the upper portion of the folded kameez with tactile stitch relief.`
          );
        }

        if (dupattaIndex >= 0) {
          promptParts.push(
            `DUPATTA SCARF DRAPING: The authentic dupatta scarf from @image${dupattaIndex + 2} is artfully folded, draped, or fanned out across the staging surface alongside the kameez, displaying its delicate borders, lace, printed motifs, and soft fabric folds.`
          );
        }

        if (bottomIndex >= 0) {
          promptParts.push(
            `BOTTOM / SALWAR FABRIC: The coordinating bottom fabric from @image${bottomIndex + 2} is neatly folded and arranged in the set, faithfully matching its true fabric hue and texture.`
          );
        }

        if (completeIndex >= 0) {
          promptParts.push(
            `ENSEMBLE ARRANGEMENT HARMONY: The overall styling layout and component positioning harmoniously mirrors the ensemble reference in @image${completeIndex + 2}.`
          );
        }
      }

      promptParts.push(
        `REALISTIC LIGHTING & AMBIENT CONTACT SHADOWS: Soft uniform daylight studio illumination. The folded fabric pieces must cast authentic, subtle contact ambient occlusion shadows directly onto the ${matchedTemplate.surface} surface of @image1, grounding them physically and naturally into the scene with zero cutout halo, zero floating effect, and zero green-screen artifact. Crisp tack-sharp focus edge-to-edge (f/8 aperture), visible fabric micro-texture, 8k resolution, publication-grade commercial product catalog lookbook.`
      );

      fluxPrompt = promptParts.join(" ");

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
      const blouseGarment = preparedGarments.find(
        (g) => g.role === "blouse" || g.slotLabel?.toLowerCase().includes("blouse")
      );
      const blouseDirective = blouseGarment
        ? `MANDATORY BLOUSE SPECIFICATION: The model MUST wear a fully tailored, beautifully fitted ethnic saree blouse (choli) crafted directly from the uploaded blouse reference photo (${blouseGarment.slotLabel}). Faithfully transfer its exact fabric, color, neckline, and sleeves neatly fitted beneath the saree pallu drape.`
        : `MANDATORY BLOUSE SPECIFICATION: The model MUST wear a tailored, elegant ethnic saree blouse (choli) properly fitted beneath the saree pallu drape, harmonizing with the saree border and zari.`;

      const buildPalluDirective = (firstGarmentIndex: number): string => {
        const palluGarments = preparedGarments
          .map((g, i) => ({ g, i }))
          .filter(
            ({ g }) =>
              g.role?.includes("pallu") ||
              g.slotLabel?.toLowerCase().includes("pallu") ||
              g.slotLabel?.toLowerCase().includes("border")
          );
        if (palluGarments.length > 0) {
          const tokens = palluGarments.map(({ i }) => `@image${firstGarmentIndex + i}`).join(" and ");
          return `PALLU & BORDER SPECIFICATION: Replicate the intricate zari embroidery, end-piece motifs, and decorative border detailing visible in ${tokens} precisely along the pallu drape and hemline borders.`;
        }
        return "";
      };

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
          `Preserve Pose & Sharp Environmental Setting: Preserve the exact body posture, natural hand anatomy, lighting direction, and background environment from @image2.`,
          `CRITICAL SHARP IN-FOCUS BACKGROUND & GROUNDING: The entire background setting and architecture from @image2 must remain sharp, clear, and fully in focus (deep f/8 aperture, zero background blur, zero shallow focus, zero artificial bokeh). The model must appear realistically integrated and physically grounded inside the space, casting authentic soft contact shadows onto the floor/ground, with ambient light from the surroundings naturally illuminating her skin and outfit.`,
          `Garment Draping: Drape the model in the authentic ${fabricTitleDescriptor}ethnic garment from ${garmentTokens} (${outfitType}).`,
          fabricDirective,
          blouseDirective,
          buildPalluDirective(3),
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
          `Preserve Pose & Sharp Environmental Setting: Preserve the exact body pose, posture, natural five-finger hand anatomy, and background setting from @image1.`,
          `CRITICAL SHARP IN-FOCUS BACKGROUND & GROUNDING: The background environment and architecture from @image1 must remain crisp, tack-sharp, and completely in focus (deep f/8 focus, zero background blur, zero shallow depth of field, zero artificial bokeh). The model must appear realistically present and physically grounded inside the scene, casting natural soft contact shadows onto the floor, with matching ambient light bounce and perspective.`,
          `Garment Draping: Replace her outfit completely with the authentic ${fabricTitleDescriptor}ethnic garment from ${garmentTokens} (${outfitType}).`,
          fabricDirective,
          blouseDirective,
          buildPalluDirective(2),
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
          `Crucial Zero-Hallucination Mandate: Preserve the exact model's facial features, facial identity, warm natural smile, natural skin texture, hair, hand anatomy, posture, pose, and background environment exactly as shown in @image1.`,
          `CRITICAL SHARP IN-FOCUS BACKGROUND & GROUNDING: The background setting, architecture, and environment from @image1 must remain completely in focus and tack-sharp (deep f/8 aperture, zero background blur, zero blurry backdrop, zero artificial bokeh). The model must be realistically grounded and physically positioned inside the scene, with authentic contact shadows on the floor/ground and seamless environmental lighting bounce matching the space.`,
          `Replace her outfit completely with the authentic ${fabricTitleDescriptor}ethnic garment shown in ${garmentTokens}.`,
          fabricDirective,
          blouseDirective,
          buildPalluDirective(2),
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

    const FAL_PRIMARY_MODEL = process.env.FAL_EDIT_ENDPOINT || "openai/gpt-image-2.5/sunburst/edit";
    const validAspectRatio = ["4:5", "3:4", "9:16", "1:1"].includes(aspectRatio) ? aspectRatio : "4:5";
    console.log(`DEBUG: Calling ${FAL_PRIMARY_MODEL} (FaceMode: ${faceMode}, References: ${imageUrls.length}, Output Target: ${dimensions.width}x${dimensions.height} = ${((dimensions.width * dimensions.height) / 1e6).toFixed(2)} MP, AR: ${validAspectRatio})`);

    // 5. Execute Fal.ai OpenAI GPT-Image 2.5 Sunburst Edit Pipeline (Native 4.6 MP with automatic fallback)
    // Bounded by a global concurrency gate and a hard per-run timeout. If Fal
    // fails we return 503 WITHOUT touching the wallet: money is only ever taken
    // after an image actually exists.
    lastRunStartedAt.set(user.id, Date.now());
    await acquireFalSlot();

    let falResult: FalRunResult;
    try {
      falResult = await retryOperation(async () => {
        try {
          const isSunburst = FAL_PRIMARY_MODEL.includes("sunburst") || FAL_PRIMARY_MODEL.includes("gpt-image");
          const isSeedream = FAL_PRIMARY_MODEL.includes("seedream");
          const isNanoBanana = FAL_PRIMARY_MODEL.includes("nano-banana");
          const isFlux = FAL_PRIMARY_MODEL.includes("flux");

          const inputPayload: Record<string, any> = {
            image_urls: imageUrls,
            prompt: fluxPrompt,
            image_size: dimensions,
            output_format: "png"
          };

          // Specific parameters for models that require custom schema
          if (isSunburst) {
            inputPayload.quality = "high"; // Fast, native 4.61 MP editorial resolution
          } else if (isFlux) {
            inputPayload.safety_tolerance = "2";
          } else if (!isSeedream) {
            inputPayload.resolution = isNanoBanana ? "2K" : "2k";
            inputPayload.aspect_ratio = validAspectRatio;
            inputPayload.safety_tolerance = "2";
          }

          return await fal.run(FAL_PRIMARY_MODEL, {
            input: inputPayload,
            abortSignal: AbortSignal.timeout(FAL_RUN_TIMEOUT_MS)
          });
        } catch (primaryErr) {
          if (FAL_PRIMARY_MODEL !== "fal-ai/flux-2-pro/edit") {
            console.warn(`Primary model ${FAL_PRIMARY_MODEL} encountered an error, falling back to fal-ai/flux-2-pro/edit:`, primaryErr);
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
          }
          throw primaryErr;
        }
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
            : mode === "flatlay"
            ? `FLATLAY STUDIO: ${stagingTemplateName}`
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
      output_url: generatedImageUrl,
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
