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
      shootImageUrl = "/reference_shoots/garden_01_morning_sun.jpg",
      shootSetting = "Botanical Garden with Soft Greenery Bokeh & Natural Morning Flare",
      shootPose = "Relaxed natural standing pose with hand resting gently at waist",
      
      // 3 Face Modes: "keep_original" | "custom_face" | "random_face"
      faceMode = "keep_original",
      customFaceUrl = null,
      aspectRatio = "4:5",

      // Magic Mode parameters
      modelId = "indian_female_standard",
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

      const logPrompt = mode === "magic"
        ? `MAGIC: ${outfitType} | Pose: ${poseName} | Bg: ${backgroundName} (${reason})`
        : `STUDIO: ${shootTitle} | Face: ${faceMode} (${reason})`;

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

    // 3. Resolve Public URLs for All Images (Ensures local /reference_... are uploaded to Fal CDN)
    const publicGarmentUrls = await Promise.all(
      activeGarments.map(async (g) => await ensurePublicUrl(g.url))
    );

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
      // Multi-Reference Mapping: [Pose Anchor, Face Anchor, Background Anchor, ...Garments] (Max 8)
      // =========================================================================
      interface RefEntry {
        url: string;
        type: "pose" | "face" | "background" | "garment";
        index: number;
      }
      const refList: RefEntry[] = [];

      // Slot A: Pose Reference Image (if not custom text pose)
      if (poseImageUrl && poseId !== "custom") {
        const publicPose = await ensurePublicUrl(poseImageUrl);
        if (publicPose) {
          refList.push({ url: publicPose, type: "pose", index: refList.length + 1 });
        }
      }

      // Slot B: Brand Custom Model Face (if provided)
      const rawFace = customFaceUrl || (faceMode === "custom_face" ? modelFaceUrl : null);
      if (rawFace) {
        const publicFace = await ensurePublicUrl(rawFace);
        if (publicFace) {
          refList.push({ url: publicFace, type: "face", index: refList.length + 1 });
        }
      }

      // Slot C: Background Reference Image (if provided and not custom text)
      if (backgroundUrl && backgroundId !== "custom" && backgroundUrl !== poseImageUrl) {
        const publicBg = await ensurePublicUrl(backgroundUrl);
        if (publicBg) {
          refList.push({ url: publicBg, type: "background", index: refList.length + 1 });
        }
      }

      // Slot D: Product Garment Fabrics (Up to remaining slots, max 8 total)
      const garmentIndices: number[] = [];
      for (const gUrl of publicGarmentUrls) {
        if (refList.length < 8 && gUrl) {
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

      // Quality & Physics
      promptParts.push(
        `Precision Details: Transfer all intricate zari embroidery, weave motifs, border highlights, fabric sheen, and authentic pleat/pallu falls with true physical gravity. Flawless human anatomy, realistic slender hands and five natural fingers, sharp studio editorial lighting, 8k resolution, photorealistic luxury lookbook.`
      );

      fluxPrompt = promptParts.filter(Boolean).join(" ");

    } else {
      // =========================================================================
      // STUDIO LOOKBOOKS (WHOLESALE SAREES / MASTER SHOOTS) PIPELINE
      // Zero Hallucination Anchor: [Shoot Reference, Face Reference (opt), ...Garments]
      // =========================================================================
      const rawShootUrl = shootImageUrl || "/reference_shoots/garden_01_morning_sun.jpg";
      const publicShootUrl = await ensurePublicUrl(rawShootUrl);

      if (faceMode === "custom_face" && (customFaceUrl || modelFaceUrl)) {
        // CUSTOM FACE MODE:
        // Image 1: Brand Model Face
        // Image 2: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
        // Images 3+: Product Garment Fabrics (Max 8 total)
        const publicFaceUrl = await ensurePublicUrl(customFaceUrl || modelFaceUrl);
        const gUrls = publicGarmentUrls.slice(0, 6); // 1 face + 1 shoot + 6 garments = 8
        imageUrls = [publicFaceUrl, publicShootUrl, ...gUrls];

        const garmentRange = gUrls.length === 1 
          ? "Reference Image 3" 
          : `Reference Images 3 to ${imageUrls.length}`;

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial portrait photograph.`,
          `Facial Identity Transfer: Transfer the exact facial identity, features, and expression of the model in Reference Image 1 onto the model in Reference Image 2.`,
          `Preserve Pose & Setting: Preserve the exact body pose, natural hand anatomy, posture, lighting, and background setting from Reference Image 2 (${shootTitle}: ${shootSetting || backgroundName}).`,
          `Garment Draping: Drape the model in the authentic ethnic garment from ${garmentRange} (${outfitType}).`,
          notesSummary ? `Product specifications & layer notes: ${notesSummary}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, weave texture, and authentic pleats/pallu drape directly onto the outfit.`,
          `Seamless skin tone matching, realistic human hand anatomy, perfect physical fabric drape, sharp editorial lighting, 8k resolution, photorealistic luxury lookbook.`
        ].filter(Boolean).join(" ");

      } else if (faceMode === "random_face") {
        // DIVERSE INDIAN FACE MODE:
        // Image 1: Master Photoshoot Reference (Pose, Hands, Lighting, Setting)
        // Images 2+: Product Garment Fabrics (Max 8 total)
        const gUrls = publicGarmentUrls.slice(0, 7);
        imageUrls = [publicShootUrl, ...gUrls];

        const garmentRange = gUrls.length === 1 
          ? "Reference Image 2" 
          : `Reference Images 2 to ${imageUrls.length}`;

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial photograph of a stunning, elegant Indian woman model with natural features, radiant skin, and a warm confident expression.`,
          `Preserve Pose & Setting: Preserve the exact body pose, posture, natural five-finger hand anatomy, and background setting from Reference Image 1 (${shootTitle}: ${shootSetting || backgroundName}).`,
          `Garment Draping: Replace her outfit completely with the authentic ethnic garment from ${garmentRange} (${outfitType}).`,
          notesSummary ? `Product specifications: ${notesSummary}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, weave, texture, and authentic drape directly onto her outfit.`,
          `Flawless human anatomy, realistic slender hands and fingers with gold bangles, perfect authentic fabric drape physics, sharp studio editorial lighting, 8k resolution, photorealistic luxury lookbook.`
        ].filter(Boolean).join(" ");

      } else {
        // KEEP ORIGINAL SHOOT FACE (FLAGSHIP ZERO HALLUCINATION):
        // Image 1: Master Photoshoot Reference (Model Face + Pose + Hands + Lighting + Setting)
        // Images 2+: Product Garment Fabrics (Max 8 total)
        const gUrls = publicGarmentUrls.slice(0, 7);
        imageUrls = [publicShootUrl, ...gUrls];

        const garmentRange = gUrls.length === 1 
          ? "Reference Image 2" 
          : `Reference Images 2 to ${imageUrls.length}`;

        fluxPrompt = [
          `High-end luxury Indian fashion catalog editorial photograph of the exact model from Reference Image 1 wearing the authentic ethnic garment from ${garmentRange} (${outfitType}).`,
          `Crucial Zero-Hallucination Mandate: Preserve the exact model's facial features, facial identity, warm natural smile, skin tone, hair, natural hand anatomy, posture, pose, and background environment exactly as shown in Reference Image 1 (${shootTitle}).`,
          `Replace her outfit completely with the authentic ethnic garment shown in ${garmentRange}.`,
          notesSummary ? `Product specifications & layer notes: ${notesSummary}.` : "",
          customNotes ? `Custom styling & drape instructions: ${customNotes}.` : "",
          `Transfer the exact intricate embroidery, zari borders, fabric color, weave, texture, and pallu drape directly onto the draped outfit.`,
          `Harmonize natural ambient lighting, soft daylight highlights, and depth of field with the setting: ${shootSetting || backgroundName}.`,
          `Flawless human anatomy, realistic slender hands and fingers with gold bangles, perfect authentic fabric drape and pleat physics, sharp studio editorial lighting, 8k resolution, photorealistic luxury lookbook.`
        ].filter(Boolean).join(" ");
      }
    }

    // Strict 4MP (4 Megapixel) Target Dimension Calculations (Multiples of 16 for latent stability)
    let dimensions = { width: 1792, height: 2240 }; // 4:5 Editorial Portrait (4,014,080 pixels = ~4.01 MP)

    if (aspectRatio === "3:4") {
      dimensions = { width: 1728, height: 2304 }; // 3:4 Catalog Portrait (3,981,312 pixels = ~3.98 MP)
    } else if (aspectRatio === "9:16") {
      dimensions = { width: 1536, height: 2688 }; // 9:16 Full Length Runway (4,128,768 pixels = ~4.12 MP)
    } else if (aspectRatio === "1:1") {
      dimensions = { width: 2048, height: 2048 }; // 1:1 High-Res Square (4,194,304 pixels = ~4.19 MP)
    }

    console.log(`DEBUG: Calling fal-ai/flux-2-pro/edit (FaceMode: ${faceMode}, Images: ${imageUrls.length}, Target: ${dimensions.width}x${dimensions.height} ~4MP)`);

    // 5. Execute Fal.ai FLUX 2 Pro Multi-Image Edit Pipeline (Native 4MP Ultra-Sharp Asset)
    let falResult: any;
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
          ? `MAGIC: ${outfitType} | Pose: ${poseName} | Setting: ${backgroundName}`
          : `STUDIO: ${shootTitle} | Face: ${faceMode} | Setting: ${shootSetting || backgroundName}`,
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
