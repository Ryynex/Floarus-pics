import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fsp } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { fal } from "@fal-ai/client";

const execFileAsync = promisify(execFile);

export interface SkinPassOptions {
  imageUrl: string;
  mode?: string;
  route?: "option_a" | "option_b";
  inpaintStrength?: number;
  inpaintPrompt?: string;
  dimensions?: { width: number; height: number };
}

export interface SkinPassResult {
  applied: boolean;
  route: "option_a" | "option_b" | "none";
  finalImageUrl: string;
  faceDetected: boolean;
  maskUrl?: string | null;
  elapsedMs?: number;
  error?: string | null;
}

export const DEFAULT_MICRO_INPAINT_PROMPT =
  "Extreme close-up authentic skin texture, visible natural pores, fine facial hair, subtle skin imperfections, raw photography, 8k, photorealistic.";

export const DEFAULT_INPAINT_STRENGTH = 0.30; // Optimal range: 0.28 to 0.35

/**
 * Executes the Python script to isolate face and exposed neck, returning a soft feathered mask.
 */
async function runPythonSkinDetector(
  imageInput: string,
  outputMaskPath: string,
  options?: { localPass?: boolean; enhancedOutput?: string }
): Promise<{
  faceDetected: boolean;
  bbox?: number[] | null;
  dimensions?: { width: number; height: number };
  elapsedMs?: number;
}> {
  const pythonScript = path.resolve(process.cwd(), "scripts", "generate_skin_mask.py");
  const pythonBinary = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

  const args: string[] = [pythonScript, "--input", imageInput, "--output_mask", outputMaskPath];

  if (options?.localPass && options?.enhancedOutput) {
    args.push("--local_pass", "--enhanced_output", options.enhancedOutput);
  }

  const { stdout, stderr } = await execFileAsync(pythonBinary, args, {
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });

  if (stderr && !stdout) {
    throw new Error(`Python detector stderr: ${stderr}`);
  }

  // Parse JSON response line from stdout
  const jsonLine = stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("{") && l.endsWith("}"));

  if (!jsonLine) {
    throw new Error(`Failed to parse detector JSON output: ${stdout}`);
  }

  const parsed = JSON.parse(jsonLine);
  if (parsed.status === "error") {
    throw new Error(parsed.error || "Detector returned error status");
  }

  return {
    faceDetected: Boolean(parsed.face_detected),
    bbox: parsed.bbox || null,
    dimensions: parsed.dimensions,
    elapsedMs: parsed.elapsed_ms,
  };
}

/**
 * Phase 2 & Phase 3: Skin Micro-Pass Engine
 *
 * 1. Checks if generation mode permits facial micro-pass (skipped for flatlays).
 * 2. Intercepts the generated Sunburst image and runs local face & neck isolation (<80ms CPU, Cost: ₹0.00).
 * 3. Applies the chosen Skin Micro-Pass:
 *    - Option A: fal.ai Micro-Inpaint Pass (~₹0.25) with strength 0.28-0.35 on the masked face/neck.
 *    - Option B: 100% Local High-Frequency Frequency Separation & Micro-Pore Injection (Cost: ₹0.00).
 * 4. Fallback safe: If face isolation or inpainting encounters an issue, gracefully retains the base generation.
 */
export async function applySkinMicroPass(options: SkinPassOptions): Promise<SkinPassResult> {
  const {
    imageUrl,
    mode = "sarees",
    route = (process.env.SKIN_PASS_ROUTE as "option_a" | "option_b") || "option_a",
    inpaintStrength = Number(process.env.SKIN_INPAINT_STRENGTH) || DEFAULT_INPAINT_STRENGTH,
    inpaintPrompt = process.env.SKIN_INPAINT_PROMPT || DEFAULT_MICRO_INPAINT_PROMPT,
    dimensions,
  } = options;

  // Global disable switch
  if (process.env.ENABLE_SKIN_MICRO_PASS === "false") {
    return {
      applied: false,
      route: "none",
      finalImageUrl: imageUrl,
      faceDetected: false,
    };
  }

  // Flat-lays have no human models or faces; pass through
  if (mode === "flatlay") {
    return {
      applied: false,
      route: "none",
      finalImageUrl: imageUrl,
      faceDetected: false,
    };
  }

  const runId = crypto.randomBytes(6).toString("hex");
  const tempDir = os.tmpdir();
  const maskFile = path.join(tempDir, `florus_mask_${runId}.png`);
  const enhancedFile = path.join(tempDir, `florus_enhanced_${runId}.png`);

  try {
    const isLocalPass = route === "option_b";

    // Step 1: Automated Local Face & Skin Isolation
    const detectResult = await runPythonSkinDetector(imageUrl, maskFile, {
      localPass: isLocalPass,
      enhancedOutput: isLocalPass ? enhancedFile : undefined,
    });

    if (!detectResult.faceDetected) {
      console.log(`[SkinMicroPass] No face detected in generated image. Retaining base generation.`);
      return {
        applied: false,
        route: "none",
        finalImageUrl: imageUrl,
        faceDetected: false,
        elapsedMs: detectResult.elapsedMs,
      };
    }

    console.log(
      `[SkinMicroPass] Face & neck detected (${detectResult.dimensions?.width}x${detectResult.dimensions?.height}, ${detectResult.elapsedMs}ms). Route: ${route}`
    );

    // Step 2: Option A — fal.ai Micro-Inpaint Pass
    if (route === "option_a") {
      const maskBuffer = await fsp.readFile(maskFile);
      const maskBlob = new Blob([new Uint8Array(maskBuffer)], { type: "image/png" });
      const maskFalUrl = await fal.storage.upload(maskBlob);

      const inpaintEndpoint =
        process.env.FAL_INPAINT_ENDPOINT || "fal-ai/flux-general/inpainting";

      // Clamp strength between 0.20 and 0.45 per technical specification
      const clampedStrength = Math.min(0.45, Math.max(0.20, inpaintStrength));

      console.log(
        `[SkinMicroPass] Executing fal.ai inpaint on ${inpaintEndpoint} with strength ${clampedStrength}...`
      );

      const inpaintRes: any = await fal.run(inpaintEndpoint, {
        input: {
          prompt: inpaintPrompt,
          image_url: imageUrl,
          mask_url: maskFalUrl,
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
        console.warn("[SkinMicroPass] Inpaint returned no image URL, falling back to base image.");
        return {
          applied: false,
          route: "option_a",
          finalImageUrl: imageUrl,
          faceDetected: true,
          maskUrl: maskFalUrl,
          elapsedMs: detectResult.elapsedMs,
        };
      }

      console.log(`[SkinMicroPass] Successfully injected authentic pores & micro-texture!`);
      return {
        applied: true,
        route: "option_a",
        finalImageUrl: inpaintUrl,
        faceDetected: true,
        maskUrl: maskFalUrl,
        elapsedMs: detectResult.elapsedMs,
      };
    }

    // Step 3: Option B — 100% Local Micro-Pass (Cost: ₹0.00)
    if (route === "option_b") {
      const enhancedBuffer = await fsp.readFile(enhancedFile);
      const enhancedBlob = new Blob([new Uint8Array(enhancedBuffer)], { type: "image/png" });
      const hostedEnhancedUrl = await fal.storage.upload(enhancedBlob);

      console.log(`[SkinMicroPass] Applied Option B local pore micro-pass (Cost: ₹0.00).`);
      return {
        applied: true,
        route: "option_b",
        finalImageUrl: hostedEnhancedUrl,
        faceDetected: true,
        elapsedMs: detectResult.elapsedMs,
      };
    }

    return {
      applied: false,
      route: "none",
      finalImageUrl: imageUrl,
      faceDetected: true,
    };
  } catch (err) {
    console.warn(`[SkinMicroPass] Micro-pass failed safely, falling back to base image:`, err);
    return {
      applied: false,
      route: route || "none",
      finalImageUrl: imageUrl,
      faceDetected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    // Clean up temporary local files
    fsp.unlink(maskFile).catch(() => undefined);
    fsp.unlink(enhancedFile).catch(() => undefined);
  }
}
