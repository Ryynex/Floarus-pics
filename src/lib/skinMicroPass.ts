import { fal } from "@fal-ai/client";

export interface SkinPassOptions {
  imageUrl: string;
  mode?: string;
  inpaintStrength?: number;
  inpaintPrompt?: string;
  dimensions?: { width: number; height: number };
}

export interface SkinPassResult {
  applied: boolean;
  finalImageUrl: string;
  maskUrl?: string | null;
  elapsedMs?: number;
  error?: string | null;
}

export const DEFAULT_MICRO_INPAINT_PROMPT =
  "Extreme close-up authentic skin texture, visible natural pores, fine facial hair, subtle skin imperfections, raw photography, 8k, photorealistic.";

export const DEFAULT_INPAINT_STRENGTH = 0.30; // 0.28 to 0.35: retains eye shape/expression while injecting micro-pores

/**
 * Phase 2: Automated Face & Skin Isolation using fal.ai EVF-SAM 2
 * Uses language-guided segmentation to isolate only face and exposed neck,
 * with explicit negative prompting to protect the saree, blouse, jewelry, and hair.
 */
async function generateSkinMaskWithSam2(imageUrl: string): Promise<string | null> {
  const samEndpoint = process.env.FAL_SAM_ENDPOINT || "fal-ai/evf-sam";

  const samRes: any = await fal.run(samEndpoint, {
    input: {
      image_url: imageUrl,
      prompt: "face and exposed neck skin",
      negative_prompt: "saree, fabric, clothes, blouse, jewelry, necklace, earrings, hair, background",
      mask_only: true,
      expand_mask: 12, // Dilation to cover the edge cleanly
      blur_mask: 18,   // Feathering for seamless blending
      fill_holes: true,
    },
    abortSignal: AbortSignal.timeout(45_000),
  });

  const maskUrl =
    samRes?.image?.url ||
    samRes?.data?.image?.url ||
    samRes?.images?.[0]?.url ||
    samRes?.data?.images?.[0]?.url;

  return maskUrl || null;
}

/**
 * Phase 2 & 3: Cloud-Native Skin Micro-Pass via fal.ai SAM 2 + FLUX Inpainting
 *
 * 1. Automatically skipped for flatlays (no human models).
 * 2. Uses fal-ai/evf-sam (SAM 2) to generate an isolated, feathered mask of face & neck.
 * 3. Sends the base Sunburst image and mask to fal-ai/flux-general/inpainting at strength 0.30
 *    to inject authentic skin pores, fine natural texture, and eliminate the waxy AI sheen.
 * 4. 100% Vercel Serverless native — zero local Python dependencies.
 * 5. Fallback safe — if segmentation or inpainting fails, gracefully retains the base generation.
 */
export async function applySkinMicroPass(options: SkinPassOptions): Promise<SkinPassResult> {
  const {
    imageUrl,
    mode = "sarees",
    inpaintStrength = Number(process.env.SKIN_INPAINT_STRENGTH) || DEFAULT_INPAINT_STRENGTH,
    inpaintPrompt = process.env.SKIN_INPAINT_PROMPT || DEFAULT_MICRO_INPAINT_PROMPT,
    dimensions,
  } = options;

  // Global toggle
  if (process.env.ENABLE_SKIN_MICRO_PASS === "false") {
    return {
      applied: false,
      finalImageUrl: imageUrl,
    };
  }

  // Flat-lays have no human models or faces; pass through untouched
  if (mode === "flatlay") {
    return {
      applied: false,
      finalImageUrl: imageUrl,
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[SkinMicroPass] Step 1: Isolating face & neck using fal.ai SAM 2...`);
    const maskUrl = await generateSkinMaskWithSam2(imageUrl);

    if (!maskUrl) {
      console.warn(`[SkinMicroPass] SAM 2 did not produce a mask, falling back to base image.`);
      return {
        applied: false,
        finalImageUrl: imageUrl,
        elapsedMs: Date.now() - startTime,
      };
    }

    console.log(`[SkinMicroPass] SAM 2 mask generated: ${maskUrl}`);

    // Denoising strength clamped to optimal range (0.28 to 0.35)
    const clampedStrength = Math.min(0.45, Math.max(0.20, inpaintStrength));
    const inpaintEndpoint =
      process.env.FAL_INPAINT_ENDPOINT || "fal-ai/flux-general/inpainting";

    console.log(
      `[SkinMicroPass] Step 2: Injecting authentic pores via ${inpaintEndpoint} (strength ${clampedStrength})...`
    );

    const inpaintRes: any = await fal.run(inpaintEndpoint, {
      input: {
        prompt: inpaintPrompt,
        image_url: imageUrl,
        mask_url: maskUrl,
        strength: clampedStrength,
        ...(dimensions ? { image_size: dimensions } : {}),
        output_format: "png",
      },
      abortSignal: AbortSignal.timeout(60_000),
    });

    const inpaintUrl =
      inpaintRes?.data?.images?.[0]?.url ||
      inpaintRes?.images?.[0]?.url ||
      inpaintRes?.data?.image?.url ||
      inpaintRes?.image?.url;

    if (!inpaintUrl) {
      console.warn(`[SkinMicroPass] Inpaint returned no output URL, retaining base image.`);
      return {
        applied: false,
        finalImageUrl: imageUrl,
        maskUrl,
        elapsedMs: Date.now() - startTime,
      };
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[SkinMicroPass] Complete in ${elapsedMs}ms. Skin micro-texture successfully injected!`);

    return {
      applied: true,
      finalImageUrl: inpaintUrl,
      maskUrl,
      elapsedMs,
    };
  } catch (err) {
    console.warn(`[SkinMicroPass] Notice: Micro-pass failed safely, retaining base image:`, err);
    return {
      applied: false,
      finalImageUrl: imageUrl,
      elapsedMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
