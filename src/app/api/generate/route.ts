import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { MAX_GARMENT_REFERENCES } from "@/lib/catalogData";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Fal.ai client
const falKey = process.env.FAL_KEY || "";
if (falKey) {
  fal.config({ credentials: falKey.trim() });
}

// In-memory cache for uploaded local assets so they are only uploaded to Fal storage once
const publicUrlCache = new Map<string, string>();

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
 */
class ClientSafeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientSafeError";
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
  const cacheKey = `${trimmed}_c_${maxDim}`;
  if (publicUrlCache.has(cacheKey)) {
    return publicUrlCache.get(cacheKey)!;
  }

  let inputBuffer: Buffer | null = null;

  if (trimmed.startsWith("data:")) {
    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches[2]) {
      inputBuffer = Buffer.from(matches[2], "base64");
    }
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // Retry fetching remote URL up to 3 times with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(trimmed, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlorusLookbook/1.0",
            "Accept": "image/*,*/*;q=0.8"
          },
          signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          inputBuffer = Buffer.from(arrayBuffer);
          break;
        } else {
          lastError = new ClientSafeError(
            `Could not fetch the reference image (${describeRefSource(trimmed)}): HTTP ${res.status}.`
          );
        }
      } catch (err) {
        // Network/timeout errors can embed the full URL, so only the reason is surfaced.
        console.warn(`Fetch attempt ${attempt} failed for ${describeRefSource(trimmed)}:`, err);
        lastError = new ClientSafeError(
          `Could not reach the reference image (${describeRefSource(trimmed)}). Check your connection and try again.`
        );
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }
    if (!inputBuffer && lastError) {
      throw lastError;
    }
  } else {
    // Guard against schemes that are neither data:, http(s): nor a real on-disk path.
    // Previously a blob:/object URL fell through to the filesystem branch and produced a
    // confusing "file not found" error containing an absolute path.
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      throw new ClientSafeError(
        `Unsupported image reference (${describeRefSource(trimmed)}). Please re-upload the image.`
      );
    }

    let localRelative = trimmed;
    if (localRelative.startsWith("/")) localRelative = localRelative.slice(1);

    // Contain the resolved path inside public/ to block traversal via "../".
    const publicRoot = path.resolve(process.cwd(), "public");
    const filePath = path.resolve(publicRoot, localRelative);
    if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
      throw new ClientSafeError(`Unsupported image reference (${describeRefSource(trimmed)}).`);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      inputBuffer = fs.readFileSync(filePath);
    } else {
      throw new ClientSafeError(`Reference image not found (${describeRefSource(trimmed)}).`);
    }
  }

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new ClientSafeError(`Reference image is empty (${describeRefSource(trimmed)}).`);
  }

  // Compress to maxDim (640px) with sharp
  try {
    inputBuffer = await sharp(inputBuffer)
      .resize({
        width: maxDim,
        height: maxDim,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.error(`sharp failed to process ${describeRefSource(trimmed)}:`, err);
    throw new ClientSafeError(
      `Could not read the image (${describeRefSource(trimmed)}). It may be corrupt or in an unsupported format.`
    );
  }

  const blob = new Blob([new Uint8Array(inputBuffer)], { type: "image/jpeg" });
  const uploadedUrl = await fal.storage.upload(blob);

  if (!uploadedUrl) {
    throw new ClientSafeError(
      `Could not host the compressed image (${describeRefSource(trimmed)}). Please try again.`
    );
  }

  publicUrlCache.set(cacheKey, uploadedUrl);
  console.log(`DEBUG: Successfully compressed & uploaded '${trimmed.slice(0, 45)}' (maxDim ${maxDim}px) to Fal: ${uploadedUrl}`);
  return uploadedUrl;
}

// Helper function to retry asynchronous operations with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.warn(`DEBUG: Attempt ${attempt} failed. Retrying in ${waitTime}ms... Error: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token || token === "undefined" || token === "null" || token === "") {
    return NextResponse.json({ error: "Unauthorized: Active user session required" }, { status: 401 });
  }

  // Instantiate standard supabase client authenticated as the user
  const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
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

    // 2. Parse input request payload
    const body = await req.json();
    const {
      mode = "sarees",
      outfitType = "Wholesale Saree (6-Yard)",
      
      // Master photoshoot reference (Zero Hallucination Anchor)
      shootTitle = "Morning Sun Botanical Garden",
      shootImageUrl = "/reference_shoots/garden_01_morning_sun.jpg",
      shootSetting = "Botanical Garden with Soft Greenery Bokeh & Natural Morning Flare",
      
      // 3 Face Modes: "keep_original" | "custom_face" | "random_face"
      faceMode = "keep_original",
      customFaceUrl = null,
      aspectRatio = "4:5",

      // Magic Mode parameters
      modelName = "Indian Female Model",
      modelFaceUrl = null,
      poseId = "01_hand_on_hip_full_length",
      poseName = "Hand on Hip — Full Length",
      poseImageUrl = "",
      poseDescription = "",
      backgroundId = "01_pastel_palace_interior",
      backgroundName = "Pastel Painted Palace Interior",
      backgroundUrl = "",
      backgroundDescription = "",
      backgroundMode = "inspiration",
      hairstyle = "Default (as before)",
      hairstyleDescription = "",
      jewellery = "Default (as before)",
      jewelleryDescription = "",
      fabric = "Kanjeevaram Silk",
      fabricDescription = "",
      fabricDrapePhysics = "",
      customNotes = "",
      garments = [],
      sareeUrls = []
    } = body;

    // Collect garment photos from either structured garments array or legacy sareeUrls
    interface GarmentItem {
      url: string;
      note?: string;
      slotId?: string;
      slotLabel?: string;
    }

    const rawGarments: GarmentItem[] = garments.length > 0 
      ? garments 
      : sareeUrls.map((url: string) => ({ url, note: "" }));

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
      console.error("DEBUG ERROR: Profile query failed for user ID:", user.id);
      return NextResponse.json({
        error: `User profile not found. Database diagnostics: ${profileError?.message || "No profile record exists"}`
      }, { status: 404 });
    }

    const balance = Number(profile.balance_inr);
    const cost = 49.00;
    const availableCredits = Number((balance / 49).toFixed(1));

    // Check balance (1 credit = 1 generation)
    if (balance < cost) {
      return NextResponse.json({
        error: `Insufficient credits. Required: 1.0 Credit, Available: ${availableCredits.toFixed(1)} Credits. Please add credits to your account.`
      }, { status: 403 });
    }

    const simulatedFallbackUrl = "/images/output_flux2_pro.jpg";

    // Sandbox execution fallback helper
    const executeSandboxFallback = async (outputUrl: string, reason = "standard mock mode") => {
      console.log(`Executing sandbox simulation fallback. Reason: ${reason}`);
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const logPrompt = mode === "magic"
        ? `CUSTOM LOOKBOOK: ${outfitType} | Pose: ${poseName} | Setting: ${backgroundName} (${reason})`
        : `STUDIO LOOKBOOK: ${shootTitle} | Face: ${faceMode} (${reason})`;

      try {
        const { data: newBalance, error: rpcError } = await supabase.rpc(
          "deduct_balance_for_generation",
          {
            p_cost: cost,
            p_prompt: logPrompt,
            p_garment_url: activeGarments.map(g => g.url).join(","),
            p_face_url: customFaceUrl || modelFaceUrl || null,
            p_output_url: outputUrl
          }
        );

        if (rpcError) {
          return NextResponse.json({ error: rpcError.message }, { status: 400 });
        }

        const newBalNum = Number(newBalance);
        const remCredits = Number((newBalNum / 49).toFixed(1));

        return NextResponse.json({
          success: true,
          outputUrl,
          blurPlaceholderUrl: outputUrl,
          cost,
          creditsCost: 1,
          newBalance: newBalNum,
          remainingCredits: remCredits,
          simulated: true,
          fallbackMessage: `Notice: Operating in sandbox simulation mode. (${reason})`
        });
      } catch (dbErr) {
        console.error("Sandbox fallback credit transaction failed:", dbErr);
        return NextResponse.json(
          { error: "Could not complete the request. Please try again." },
          { status: 500 }
        );
      }
    };

    // Check Fal API key
    if (!falKey || falKey === "" || falKey.startsWith("placeholder")) {
      return executeSandboxFallback(simulatedFallbackUrl, "missing or placeholder Fal API credentials");
    }

    // 3. Compress All Garment Reference Images Directly (Max MAX_GARMENT_REFERENCES, <= 640px)
    // Per-item fault tolerance: one unreachable garment must not abort the whole
    // generation. Transient failures get retried; a permanent failure drops that
    // garment and is reported back so the client knows what was skipped.
    const garmentFailures: string[] = [];
    const compressedGarmentUrls = (
      await Promise.all(
        activeGarments.map(async (g, idx) => {
          try {
            return await retryOperation(() => getCompressedFalUrl(g.url, 640), 2, 1000);
          } catch (err) {
            const reason = err instanceof Error ? err.message : "unknown error";
            console.error(`Garment reference ${idx + 1} failed to prepare:`, reason);
            garmentFailures.push(`Garment ${idx + 1}: ${reason}`);
            return "";
          }
        })
      )
    ).filter((u) => u.length > 0);

    if (compressedGarmentUrls.length === 0) {
      return NextResponse.json(
        {
          error:
            garmentFailures[0] ||
            "None of the provided fabric reference images could be loaded. Please re-upload them.",
          skippedGarments: garmentFailures,
        },
        { status: 400 }
      );
    }

    if (garmentFailures.length > 0) {
      console.warn(
        `Continuing with ${compressedGarmentUrls.length}/${activeGarments.length} garments; skipped: ${garmentFailures.join("; ")}`
      );
    }

    // Formulate per-layer fabric notes
    const notesSummary = activeGarments
      .map((g, i) => g.note ? `Layer ${i + 1} (${g.slotLabel || 'Garment'}): ${g.note}` : "")
      .filter(Boolean)
      .join("; ");

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
      }
      const refList: RefEntry[] = [];

      // Slot A: Pose Reference Image (if not custom text pose)
      if (poseImageUrl && poseId !== "custom") {
        const compressedPose = await getCompressedFalUrl(poseImageUrl, 640);
        if (compressedPose) {
          refList.push({ url: compressedPose, type: "pose", index: refList.length + 1 });
        }
      }

      // Slot B: Brand Custom Model Face (if provided)
      const rawFace = customFaceUrl || (faceMode === "custom_face" ? modelFaceUrl : null);
      if (rawFace) {
        const compressedFace = await getCompressedFalUrl(rawFace, 640);
        if (compressedFace) {
          refList.push({ url: compressedFace, type: "face", index: refList.length + 1 });
        }
      }

      // Slot C: Background Reference Image (if provided and not custom text)
      if (backgroundUrl && backgroundId !== "custom" && backgroundUrl !== poseImageUrl) {
        const compressedBg = await getCompressedFalUrl(backgroundUrl, 640);
        if (compressedBg) {
          refList.push({ url: compressedBg, type: "background", index: refList.length + 1 });
        }
      }

      // Slot D: Product Garment Fabrics (up to MAX_GARMENT_REFERENCES, within MAX_TOTAL_REFERENCES total)
      const garmentIndices: number[] = [];
      for (const gUrl of compressedGarmentUrls) {
        if (refList.length < MAX_TOTAL_REFERENCES && gUrl) {
          const idx = refList.length + 1;
          refList.push({ url: gUrl, type: "garment", index: idx });
          garmentIndices.push(idx);
        }
      }

      imageUrls = refList.map(r => r.url);

      const poseRef = refList.find(r => r.type === "pose");
      const faceRef = refList.find(r => r.type === "face");
      const bgRef = refList.find(r => r.type === "background");

      const promptParts: string[] = [
        `High-end luxury Indian fashion catalog editorial photograph of a gorgeous ${modelName || "Indian fashion model"} showcasing a bespoke ${outfitType || "ethnic outfit"}.`
      ];

      // Model Face
      if (faceRef) {
        promptParts.push(
          `Model Face Identity: Transfer the exact facial features, eye shape, radiant skin tone, and natural expression from Reference Image ${faceRef.index} onto the model.`
        );
      } else {
        promptParts.push(
          `Model Characteristics: Beautiful Indian woman with natural radiant skin, refined features, and a confident elegant catalog expression.`
        );
      }

      // Pose
      if (poseRef) {
        promptParts.push(
          `Pose & Body Posture: Replicate the exact full-body posture, limb angles, natural hand placement, and silhouette from Reference Image ${poseRef.index} (${poseName}${poseDescription ? `: ${poseDescription}` : ""}).`
        );
      } else if (poseDescription) {
        promptParts.push(
          `Pose & Posture: Direct the model in the custom pose: ${poseDescription}.`
        );
      } else {
        promptParts.push(`Pose: Elegant natural standing pose with graceful hand placement.`);
      }

      // Background
      if (bgRef) {
        if (backgroundMode === "fixed") {
          promptParts.push(
            `Background & Environment (STRICT FIXED MODE): Place the model directly within the exact architectural backdrop, spatial perspective, horizon, and room geometry of Reference Image ${bgRef.index} (${backgroundName}${backgroundDescription ? `: ${backgroundDescription}` : ""}). Synchronize lighting direction and shadows seamlessly.`
          );
        } else {
          promptParts.push(
            `Background Atmosphere (INSPIRATION MODE): Draw the luxurious ambient aesthetic, warm color temperature, and setting mood from Reference Image ${bgRef.index} (${backgroundName}${backgroundDescription ? `: ${backgroundDescription}` : ""}). Harmonize depth of field with soft bokeh.`
          );
        }
      } else if (backgroundDescription) {
        promptParts.push(
          `Background & Setting: High-end editorial environment: ${backgroundDescription}. Soft balanced ambient light.`
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
        const garmentRangeStr = garmentIndices.length === 1 
          ? `Reference Image ${garmentIndices[0]}` 
          : `Reference Images ${garmentIndices[0]} to ${garmentIndices[garmentIndices.length - 1]}`;
        promptParts.push(
          `Product Garment Draping: Drape the authentic ethnic outfit from ${garmentRangeStr} directly onto the model.`
        );
      }

      if (notesSummary) {
        promptParts.push(`Product layer notes & specifications: ${notesSummary}.`);
      }

      if (customNotes) {
        promptParts.push(`Styling & drape instructions: ${customNotes}.`);
      }

      // Fabric & Drape Physics Conditioning
      if (fabric) {
        promptParts.push(
          `Garment Fabric & Drape Physics: The garment is tailored from authentic ${fabric}${fabricDescription ? ` (${fabricDescription})` : ""}. ${fabricDrapePhysics || `Authentic tactile textile realism with natural physical drape and pleat gravity corresponding to ${fabric}`}. Accurately render the true optical sheen, light reflection, weave texture, and authentic weight and fall of ${fabric}.`
        );
      }

      // Quality, Skin Realism & Fabric Physics
      promptParts.push(
        `Hyper-realistic raw photography aesthetic: authentic non-glossy human skin texture, visible natural micro-pores and subtle fine skin grain, soft matte finish without artificial plastic smoothness or waxy glow. Authentic tactile textile realism: crisp woven fabric texture, distinct warp and weft thread grain, tactile yarn slubs, genuine zari embroidery relief, and realistic fabric gravity drape. Natural human anatomy, slender hands with five natural fingers, Hasselblad editorial studio lighting, 8k resolution, photorealistic master lookbook.`
      );

      fluxPrompt = promptParts.filter(Boolean).join(" ");

    } else {
      // =========================================================================
      // STUDIO LOOKBOOKS (WHOLESALE SAREES / MASTER SHOOTS) PIPELINE
      // Zero Hallucination Anchor: [Shoot Reference, Face Reference (opt), ...Garments]
      // =========================================================================
      const rawShootUrl = shootImageUrl || "/reference_shoots/garden_01_morning_sun.jpg";
      const compressedShootUrl = await getCompressedFalUrl(rawShootUrl, 640);

      if (faceMode === "custom_face" && (customFaceUrl || modelFaceUrl)) {
        // CUSTOM FACE MODE:
        // Image 1: Brand Model Face
        // Image 2: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
        // Images 3+: Product Garment Fabrics
        const compressedFaceUrl = await getCompressedFalUrl(customFaceUrl || modelFaceUrl, 640);
        const gUrls = compressedGarmentUrls.slice(0, MAX_GARMENT_REFERENCES);
        imageUrls = [compressedFaceUrl, compressedShootUrl, ...gUrls];

        const garmentRange = gUrls.length === 1 
          ? "Reference Image 3" 
          : `Reference Images 3 to ${imageUrls.length}`;

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial portrait photograph.`,
          `Facial Identity Transfer: Transfer the exact facial identity, features, and expression of the model in Reference Image 1 onto the model in Reference Image 2.`,
          `Preserve Pose & Setting: Preserve the exact body pose, natural hand anatomy, posture, lighting, and background setting from Reference Image 2 (${shootTitle}: ${shootSetting || backgroundName}).`,
          `Garment Draping: Drape the model in the authentic ethnic garment from ${garmentRange} (${outfitType}).`,
          fabric ? `Fabric & Drape Realism: Crafted from authentic ${fabric}${fabricDescription ? ` (${fabricDescription})` : ""}. Drape physics: ${fabricDrapePhysics || `authentic textile weave grain with true physical drape gravity corresponding to ${fabric}`}. Render realistic textile luster, specular sheen, and authentic pleat/pallu fall.` : "",
          notesSummary ? `Product specifications & layer notes: ${notesSummary}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, tactile weave texture, and authentic pleats/pallu drape directly onto the outfit.`,
          `Hyper-realistic natural skin micro-pores, matte non-glossy skin finish, un-airbrushed raw texture, realistic slender hand anatomy, tactile garment weave grain with true physical drape gravity, sharp editorial lighting, 8k resolution master lookbook.`
        ].filter(Boolean).join(" ");

      } else if (faceMode === "random_face") {
        // DIVERSE INDIAN FACE MODE:
        // Image 1: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
        // Images 2+: Product Garment Fabrics
        const gUrls = compressedGarmentUrls.slice(0, MAX_GARMENT_REFERENCES);
        imageUrls = [compressedShootUrl, ...gUrls];

        const garmentRange = gUrls.length === 1 
          ? "Reference Image 2" 
          : `Reference Images 2 to ${imageUrls.length}`;

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial photograph of a stunning, elegant Indian woman model with natural authentic features, non-glossy matte skin, and a warm confident expression.`,
          `Preserve Pose & Setting: Preserve the exact body pose, posture, natural five-finger hand anatomy, and background setting from Reference Image 1 (${shootTitle}: ${shootSetting || backgroundName}).`,
          `Garment Draping: Replace her outfit completely with the authentic ethnic garment from ${garmentRange} (${outfitType}).`,
          fabric ? `Fabric & Drape Realism: Crafted from authentic ${fabric}${fabricDescription ? ` (${fabricDescription})` : ""}. Drape physics: ${fabricDrapePhysics || `authentic textile weave grain with true physical drape gravity corresponding to ${fabric}`}. Render realistic textile luster, specular sheen, and authentic pleat/pallu fall.` : "",
          notesSummary ? `Product specifications: ${notesSummary}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, yarn weave texture, and authentic drape directly onto her outfit.`,
          `Hyper-realistic human skin with visible fine pores and subtle natural grain (no waxy or plastic airbrushing), realistic slender hands and fingers with gold bangles, tactile textile weave with authentic physical drape physics, sharp studio editorial lighting, 8k resolution master lookbook.`
        ].filter(Boolean).join(" ");

      } else {
        // KEEP ORIGINAL SHOOT FACE (FLAGSHIP ZERO HALLUCINATION):
        // Image 1: Master Photoshoot Reference (Model Face + Pose + Hands + Lighting + Setting)
        // Images 2+: Product Garment Fabrics
        const gUrls = compressedGarmentUrls.slice(0, MAX_GARMENT_REFERENCES);
        imageUrls = [compressedShootUrl, ...gUrls];

        const garmentRange = gUrls.length === 1 
          ? "Reference Image 2" 
          : `Reference Images 2 to ${imageUrls.length}`;

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial photograph of the exact model from Reference Image 1 wearing the authentic ethnic garment from ${garmentRange} (${outfitType}).`,
          `Crucial Zero-Hallucination Mandate: Preserve the exact model's facial features, facial identity, warm natural smile, natural skin texture, hair, hand anatomy, posture, pose, and background environment exactly as shown in Reference Image 1 (${shootTitle}).`,
          `Replace her outfit completely with the authentic ethnic garment shown in ${garmentRange}.`,
          fabric ? `Fabric & Drape Realism: Crafted from authentic ${fabric}${fabricDescription ? ` (${fabricDescription})` : ""}. Drape physics: ${fabricDrapePhysics || `authentic textile weave grain with true physical drape gravity corresponding to ${fabric}`}. Render realistic textile luster, specular sheen, and authentic pleat/pallu fall.` : "",
          notesSummary ? `Product specifications & layer notes: ${notesSummary}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, tactile thread weave texture, and pallu drape directly onto the draped outfit.`,
          `Harmonize natural ambient lighting, soft daylight highlights, and depth of field with the setting: ${shootSetting || backgroundName}.`,
          `Hyper-realistic natural skin with subtle pores and matte finish (non-glossy, non-waxy, raw photographic realism), realistic slender hands and fingers, tangible fabric thread grain with physical drape and pleat gravity, sharp studio editorial lighting, 8k resolution master lookbook.`
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
          }
        });
      }, 2, 3000);
    } catch (falErr) {
      const errMsg = falErr instanceof Error ? falErr.message : "Fal inference failed";
      console.warn("Outbound Fal.ai call failed after retries. Falling back to sandbox:", errMsg);
      return executeSandboxFallback(simulatedFallbackUrl, `Fal API Error: ${errMsg}`);
    }

    const imgObj = falResult?.data?.images?.[0] || falResult?.images?.[0];
    const generatedImageUrl = 
      imgObj?.url || 
      falResult?.data?.image?.url || 
      falResult?.image?.url;

    if (!generatedImageUrl) {
      console.warn("No direct image URL from Fal result:", falResult);
      return executeSandboxFallback(simulatedFallbackUrl, "No image returned by Fal engine");
    }

    const actualWidth = imgObj?.width || dimensions.width;
    const actualHeight = imgObj?.height || dimensions.height;
    const actualMP = ((actualWidth * actualHeight) / 1000000).toFixed(2);
    console.log(`DEBUG: Fal.ai FLUX 2 Pro generation successful. Resolution: ${actualWidth}x${actualHeight} (${actualMP} MP). URL: ${generatedImageUrl}`);

    // 6. Deduct balance and log generation atomically in Supabase (Immediate)
    const { data: newBalance, error: rpcError } = await supabase.rpc(
      "deduct_balance_for_generation",
      {
        p_cost: cost,
        p_prompt: mode === "magic"
          ? `CUSTOM LOOKBOOK: ${outfitType} | Pose: ${poseName} | Setting: ${backgroundName}`
          : `STUDIO LOOKBOOK: ${shootTitle} | Face: ${faceMode} | Setting: ${shootSetting || backgroundName}`,
        p_garment_url: activeGarments.map(g => g.url).join(","),
        p_face_url: customFaceUrl || modelFaceUrl || null,
        p_output_url: generatedImageUrl
      }
    );

    if (rpcError) {
      throw new Error(`Transaction failed: ${rpcError.message}`);
    }

    const newBalNum = Number(newBalance);
    const remCredits = Number((newBalNum / 49).toFixed(1));

    // 7. Non-blocking background archiving to Cloudinary (Does NOT delay user response)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.uploader.upload(generatedImageUrl, {
        folder: "florus-lookbooks",
      }).then((uploadResult) => {
        console.log("DEBUG: Background Cloudinary archiving complete:", uploadResult.secure_url);
      }).catch((cloudErr) => {
        console.warn("Background Cloudinary archiving notice:", cloudErr?.message || cloudErr);
      });
    }

    // 8. Return native 4MP ultra-sharp lookbook immediately to the user
    return NextResponse.json({
      success: true,
      outputUrl: generatedImageUrl,
      blurPlaceholderUrl: generatedImageUrl,
      cost,
      creditsCost: 1,
      newBalance: newBalNum,
      remainingCredits: remCredits,
      simulated: false
    });

  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    console.error("Generation API internal error:", error);

    // Only messages explicitly marked client-safe are echoed back. Anything else
    // (filesystem paths, raw upstream errors, stack text) is replaced, while the
    // full detail stays in the server logs.
    const errorMsg =
      error instanceof ClientSafeError
        ? error.message
        : "Image generation failed due to an internal error. Please try again.";

    console.error(`Internal error detail: ${rawMsg}`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
