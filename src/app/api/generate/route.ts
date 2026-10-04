import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";

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
 * Ensures any image URL (local file path or remote) is accessible via a public HTTPS URL for Fal.ai.
 * If given a local path like "/reference_shoots/01_heritage_haveli_doorway.jpg", it reads the file
 * from disk and uploads it to Fal's high-speed CDN storage.
 */
async function ensurePublicUrl(urlOrPath: string): Promise<string> {
  if (!urlOrPath) return "";
  const trimmed = urlOrPath.trim();

  // If already a remote public URL (and not localhost)
  if (
    (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
    !trimmed.includes("localhost") &&
    !trimmed.includes("127.0.0.1")
  ) {
    return trimmed;
  }

  // Check cache
  if (publicUrlCache.has(trimmed)) {
    return publicUrlCache.get(trimmed)!;
  }

  // Extract relative path from public folder
  let localRelative = trimmed;
  if (localRelative.startsWith("http")) {
    try {
      const parsed = new URL(localRelative);
      localRelative = parsed.pathname;
    } catch {
      // continue
    }
  }

  if (localRelative.startsWith("/")) {
    localRelative = localRelative.slice(1);
  }

  const filePath = path.join(process.cwd(), "public", localRelative);

  if (fs.existsSync(filePath)) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const blob = new Blob([fileBuffer], { type: mimeType });
      const uploadedUrl = await fal.storage.upload(blob);
      if (uploadedUrl) {
        publicUrlCache.set(trimmed, uploadedUrl);
        console.log(`DEBUG: Uploaded local asset '${trimmed}' to Fal storage: ${uploadedUrl}`);
        return uploadedUrl;
      }
    } catch (uploadErr) {
      console.warn(`Failed to upload local image '${trimmed}' to Fal storage:`, uploadErr);
    }
  } else {
    console.warn(`Local file path does not exist on disk: ${filePath}`);
  }

  return trimmed;
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
      shootId = "shoot_10_garden_morning",
      shootTitle = "Morning Sun Botanical Garden",
      shootImageUrl = "/reference_shoots/10_botanical_garden_morning_sun.jpg",
      shootSetting = "Botanical Garden with Soft Greenery Bokeh & Natural Morning Flare",
      shootPose = "Relaxed natural standing pose with hand resting gently at waist",
      
      // 3 Face Modes: "keep_original" | "custom_face" | "random_face"
      faceMode = "keep_original",
      customFaceUrl = null,

      // Legacy fallbacks
      modelId = "indian_female_standard",
      modelName = "Indian Female Model",
      modelFaceUrl = null,
      poseId = "hand-on-hip",
      poseName = "Hand on hip — full length",
      poseImageUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
      backgroundId = "pastel-palace",
      backgroundName = "Pastel painted palace interior",
      backgroundUrl = "https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=600&q=80",
      backgroundMode = "inspiration",
      hairstyle = "Default (as before)",
      jewellery = "Default (as before)",
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

    const activeGarments: GarmentItem[] = garments.length > 0 
      ? garments 
      : sareeUrls.map((url: string) => ({ url, note: "" }));

    if (activeGarments.length === 0 || !activeGarments[0]?.url) {
      return NextResponse.json({ error: "At least one product fabric reference image is required" }, { status: 400 });
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

    // Check balance
    if (balance < cost) {
      return NextResponse.json({
        error: `Insufficient balance. Required: ₹${cost.toFixed(2)}, Available: ₹${balance.toFixed(2)}. Please recharge your wallet.`
      }, { status: 403 });
    }

    const simulatedFallbackUrl = "/images/output_flux2_pro.jpg";

    // Sandbox execution fallback helper
    const executeSandboxFallback = async (outputUrl: string, reason = "standard mock mode") => {
      console.log(`Executing sandbox simulation fallback. Reason: ${reason}`);
      await new Promise((resolve) => setTimeout(resolve, 2500));

      try {
        const { data: newBalance, error: rpcError } = await supabase.rpc(
          "deduct_balance_for_generation",
          {
            p_cost: cost,
            p_prompt: `${mode.toUpperCase()}: ${outfitType} | Shoot: ${shootTitle} | Face: ${faceMode} (${reason})`,
            p_garment_url: activeGarments.map(g => g.url).join(","),
            p_face_url: customFaceUrl || modelFaceUrl || null,
            p_output_url: outputUrl
          }
        );

        if (rpcError) {
          return NextResponse.json({ error: rpcError.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          outputUrl,
          blurPlaceholderUrl: outputUrl,
          cost,
          newBalance: Number(newBalance),
          simulated: true,
          fallbackMessage: `Notice: Operating in sandbox simulation mode. (${reason})`
        });
      } catch (dbErr) {
        const errorMsg = dbErr instanceof Error ? dbErr.message : "Failed to execute transaction";
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }
    };

    // Check Fal API key
    if (!falKey || falKey === "" || falKey.startsWith("placeholder")) {
      return executeSandboxFallback(simulatedFallbackUrl, "missing or placeholder Fal API credentials");
    }

    // 3. Resolve Public URLs for All Images (Ensures local /reference_shoots/... are uploaded to Fal CDN)
    const rawShootUrl = shootImageUrl || poseImageUrl;
    const publicShootUrl = await ensurePublicUrl(rawShootUrl);

    const publicGarmentUrls = await Promise.all(
      activeGarments.map(async (g) => await ensurePublicUrl(g.url))
    );

    // Formulate per-layer fabric notes
    const notesSummary = activeGarments
      .map((g, i) => g.note ? `Layer ${i + 1} (${g.slotLabel || 'Garment'}): ${g.note}` : "")
      .filter(Boolean)
      .join("; ");

    // 4. Formulate Multi-Image References and Prompt based on Face Mode
    let imageUrls: string[] = [];
    let fluxPrompt = "";

    if (faceMode === "custom_face" && (customFaceUrl || modelFaceUrl)) {
      // CUSTOM FACE MODE:
      // Image 1: Brand Model Face
      // Image 2: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
      // Images 3+: Product Garment Fabrics
      const publicFaceUrl = await ensurePublicUrl(customFaceUrl || modelFaceUrl);
      imageUrls = [publicFaceUrl, publicShootUrl, ...publicGarmentUrls];

      fluxPrompt = [
        `High-end luxury Indian fashion catalog editorial portrait photograph.`,
        `Transfer the exact facial identity, features, and expression of the model in the first reference image onto the model in the second reference image.`,
        `Preserve the exact body pose, natural hand anatomy, posture, lighting, and background setting from the second reference image (${shootTitle}: ${shootSetting || backgroundName}).`,
        `Drape her in the authentic ethnic garment from the subsequent product reference images.`,
        notesSummary ? `Product specifications: ${notesSummary}.` : "",
        customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
        `Transfer the exact intricate embroidery, zari borders, fabric color, texture, and authentic pleats/pallu drape directly onto the outfit.`,
        `Seamless skin tone matching, realistic human hand anatomy, perfect physical fabric drape, sharp editorial lighting, 8k resolution, photorealistic luxury lookbook.`
      ].filter(Boolean).join(" ");

    } else if (faceMode === "random_face") {
      // RANDOM DIVERSE INDIAN FACE MODE:
      // Image 1: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
      // Images 2+: Product Garment Fabrics
      imageUrls = [publicShootUrl, ...publicGarmentUrls];

      fluxPrompt = [
        `High-end luxury Indian fashion catalog editorial photograph of a stunning, elegant Indian woman model with natural features and a warm confident expression.`,
        `Preserve the exact body pose, posture, natural hand anatomy, and background setting from the first reference image: ${shootTitle} (${shootSetting || backgroundName}).`,
        `Replace her outfit completely with the authentic ethnic garment from the subsequent product reference images.`,
        notesSummary ? `Product specifications: ${notesSummary}.` : "",
        customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
        `Transfer the exact intricate embroidery, zari borders, fabric color, weave, texture, and authentic drape directly onto her outfit.`,
        `Flawless human anatomy, realistic slender hands and fingers with gold bangles, perfect authentic fabric drape physics, sharp studio editorial lighting, 8k resolution, photorealistic luxury lookbook.`
      ].filter(Boolean).join(" ");

    } else {
      // KEEP ORIGINAL SHOOT FACE (FLAGSHIP / ZERO HALLUCINATION):
      // Image 1: Master Photoshoot Reference (Model Face + Pose + Hands + Lighting + Setting)
      // Images 2+: Product Garment Fabrics
      imageUrls = [publicShootUrl, ...publicGarmentUrls];

      fluxPrompt = [
        `High-end luxury Indian fashion catalog editorial photograph of the exact model from the first reference image wearing the authentic ethnic garment from the subsequent garment reference images.`,
        `Crucial requirements: Preserve the exact model's facial features, facial identity, warm natural smile, skin tone, hair, natural hand anatomy, posture, pose, and background environment exactly as shown in the first image (${shootTitle}).`,
        `Replace her outfit completely with the authentic ethnic garment shown in the product reference images.`,
        notesSummary ? `Product specifications: ${notesSummary}.` : "",
        customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
        `Transfer the exact intricate embroidery, zari borders, fabric color, weave, texture, and pallu drape directly onto the draped outfit.`,
        `Harmonize natural ambient lighting, soft daylight highlights, and depth of field with the setting: ${shootSetting || backgroundName}.`,
        `Flawless human anatomy, realistic slender hands and fingers with gold bangles, perfect authentic fabric drape and pleat physics, sharp studio editorial lighting, 8k resolution, photorealistic luxury lookbook.`
      ].filter(Boolean).join(" ");
    }

    console.log(`DEBUG: Calling fal-ai/flux-2-pro/edit (FaceMode: ${faceMode}, Images: ${imageUrls.length})`);

    // 5. Execute Fal.ai FLUX 2 Pro Multi-Image Edit Pipeline
    let falResult: any;
    try {
      falResult = await retryOperation(async () => {
        return await fal.run("fal-ai/flux-2-pro/edit", {
          input: {
            image_urls: imageUrls,
            prompt: fluxPrompt
          }
        });
      }, 2, 3000);
    } catch (falErr) {
      const errMsg = falErr instanceof Error ? falErr.message : "Fal inference failed";
      console.warn("Outbound Fal.ai call failed after retries. Falling back to sandbox:", errMsg);
      return executeSandboxFallback(simulatedFallbackUrl, `Fal API Error: ${errMsg}`);
    }

    const generatedImageUrl = 
      falResult?.data?.images?.[0]?.url || 
      falResult?.images?.[0]?.url || 
      falResult?.data?.image?.url || 
      falResult?.image?.url;

    if (!generatedImageUrl) {
      console.warn("No direct image URL from Fal result:", falResult);
      return executeSandboxFallback(simulatedFallbackUrl, "No image returned by Fal engine");
    }

    console.log("DEBUG: Fal.ai FLUX 2 Pro generation successful. Generated URL:", generatedImageUrl);

    // 6. Deduct balance and log generation atomically in Supabase (Immediate)
    const { data: newBalance, error: rpcError } = await supabase.rpc(
      "deduct_balance_for_generation",
      {
        p_cost: cost,
        p_prompt: `${mode.toUpperCase()}: Shoot: ${shootTitle} | Face: ${faceMode} | Bg: ${shootSetting || backgroundName}`,
        p_garment_url: activeGarments.map(g => g.url).join(","),
        p_face_url: customFaceUrl || modelFaceUrl || null,
        p_output_url: generatedImageUrl
      }
    );

    if (rpcError) {
      throw new Error(`Transaction failed: ${rpcError.message}`);
    }

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
      newBalance: Number(newBalance),
      simulated: false
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("Generation API internal error:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
