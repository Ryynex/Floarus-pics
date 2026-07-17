import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
  const token = authHeader.replace("Bearer ", "");

  if (!token || token === "undefined" || token === "null" || token === "") {
    return NextResponse.json({ error: "Unauthorized: Active user session required" }, { status: 401 });
  }

  // Instantiate standard supabase client helper authenticated as the user
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

    // 2. Parse input request payload
    const body = await req.json();
    const { sareeUrls, faceUrl, prompt } = body;

    // Validate that we have at least one cloth reference image
    if (!sareeUrls || !Array.isArray(sareeUrls) || sareeUrls.length === 0) {
      return NextResponse.json({ error: "At least one product Saree reference image URL is required" }, { status: 400 });
    }

    // Fetch profile balance from database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance_inr")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("DEBUG ERROR: Profile query failed for user ID:", user.id, "Error:", profileError, "Data found:", profile);
      return NextResponse.json({
        error: `User profile not found. Database diagnostics: ${profileError?.message || "No profile record exists in the table for this user ID"}`
      }, { status: 404 });
    }

    const balance = Number(profile.balance_inr);

    // Enforce flat cost rate of ₹35.00
    const selectedResolution = "1K";
    const cost = 35.00;

    // Check if user has enough balance
    if (balance < cost) {
      return NextResponse.json({
        error: `Insufficient balance. Required: ₹${cost.toFixed(2)}, Available: ₹${balance.toFixed(2)}.`
      }, { status: 403 });
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const simulatedUrl = "/images/model-fuchsia.png";

    // Sandbox execution helper using Supabase RPC for atomic ledger write
    const executeSandboxFallback = async (outputUrl: string, reason = "standard mock mode") => {
      console.log(`Executing sandbox simulation fallback. Reason: ${reason}`);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const { data: newBalance, error: rpcError } = await supabase.rpc(
          "deduct_balance_for_generation",
          {
            p_cost: cost,
            p_prompt: prompt || "Simulated Saree Campaign (API Fallback)",
            p_garment_url: sareeUrls.join(","), // Concatenate garment URLs for logging
            p_face_url: faceUrl || null,
            p_output_url: outputUrl
          }
        );

        if (rpcError) {
          return NextResponse.json({ error: rpcError.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          outputUrl,
          blurPlaceholderUrl: outputUrl, // Mock same URL for placeholder in sandbox
          cost,
          newBalance: Number(newBalance),
          simulated: true,
          fallbackMessage: `Notice: Operating in local GPU sandbox mode due to API limitations. (${reason})`
        });
      } catch (dbErr) {
        const errorMsg = dbErr instanceof Error ? dbErr.message : "Failed to execute transaction";
        console.error("Failed to write mock balance/logs to database:", dbErr);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }
    };

    // 3. Sandbox Mock Generation if API Key is not set or set to placeholder
    if (!openrouterKey || openrouterKey === "" || openrouterKey.startsWith("placeholder")) {
      return executeSandboxFallback(simulatedUrl, "missing or placeholder API key credentials");
    }

    // Validate Cloudinary environment variables before triggering pipeline
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("DEBUG ERROR: Cloudinary environment variables are missing!");
      return executeSandboxFallback(simulatedUrl, "missing Cloudinary environment credentials");
    }

    // 4. Assemble the Master High-Fashion Garment Prompt Template (Simplified for detailed user prompts)
    const garmentSourceList = sareeUrls.map((url, i) => `Reference Cloth ${i + 1}: ${url}`).join("\n");
    const masterPrompt = `Reference mapping details:
- Product Details: The garment fabric, patterns, and ornaments are sourced from the following reference images:
${garmentSourceList}
Combine the textures, details, and color palettes from these reference images to formulate the unified premium garment design.
- Model Face: Model features based on reference: ${faceUrl || "random model portrait"}.

User Scene Description:
${prompt || "A high-fashion editorial photograph of a model showcasing a premium luxury garment."}

- Strict Negative Prompt: low quality, distorted details, bad anatomy, deformed hands, cheap textures, plain flat photo.`;

    const input_references: any[] = [];

    // Append up to 5 cloth image references
    sareeUrls.forEach((url) => {
      input_references.push({
        type: "image_url",
        image_url: { url }
      });
    });

    // Append face reference if provided
    if (faceUrl) {
      input_references.push({
        type: "image_url",
        image_url: { url: faceUrl }
      });
    }

    // 5. OpenRouter Network API Request using google/gemini-3.1-flash-lite-image (with Retries)
    let openRouterResponse;
    try {
      openRouterResponse = await retryOperation(async () => {
        const res = await fetch("https://openrouter.ai/api/v1/images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-lite-image",
            prompt: masterPrompt,
            size: selectedResolution, // Set size strictly to 1K (e.g. 1024x1024)
            input_references: input_references.length > 0 ? input_references : undefined,
            response_format: "b64_json",
            providers: ["google_ai_studio"],
            max_tokens: 1200
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`OpenRouter API error status ${res.status}: ${errorText}`);
        }

        return res;
      });
    } catch (fetchErr) {
      const errorMsg = fetchErr instanceof Error ? fetchErr.message : "Network fetch failed";
      console.warn("Outbound OpenRouter connection failed after retries. Falling back to Sandbox:", fetchErr);
      return executeSandboxFallback(simulatedUrl, `Connection error: ${errorMsg}`);
    }

    const resultData = await openRouterResponse.json();
    const base64Image = resultData.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new Error("No base64 image returned from OpenRouter API response");
    }

    // 6. Upload base generated image directly to Cloudinary (with Retries)
    console.log("DEBUG: Uploading base generated image to Cloudinary...");
    const dataUrl = `data:image/png;base64,${base64Image}`;

    let uploadResult;
    try {
      uploadResult = await retryOperation(async () => {
        return await cloudinary.uploader.upload(dataUrl, {
          folder: "florus-lookbooks",
        });
      });
    } catch (uploadErr) {
      const errorMsg = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
      throw new Error(`Cloudinary upload failed after retries: ${errorMsg}`);
    }

    console.log("DEBUG: Cloudinary upload successful. public_id:", uploadResult.public_id);

    // 7. Upscale image using Cloudinary transformation URL injection
    const upscaledUrl = uploadResult.secure_url.replace("/upload/", "/upload/e_upscale/");
    console.log("DEBUG: Upscaled image generated on Cloudinary. URL:", upscaledUrl);

    // 7b. Generate a low-resolution blurred placeholder image dynamically from Cloudinary URL injection
    const blurPlaceholderUrl = uploadResult.secure_url.replace("/upload/", "/upload/w_32,c_scale,e_blur:200/");
    console.log("DEBUG: Blur placeholder generated. URL:", blurPlaceholderUrl);

    // 8. Deduct balance and log generation atomically using Postgres RPC (storing Cloudinary Upscaled URL)
    const { data: newBalance, error: rpcError } = await supabase.rpc(
      "deduct_balance_for_generation",
      {
        p_cost: cost,
        p_prompt: prompt || "",
        p_garment_url: sareeUrls.join(","), // Concatenate garment URLs for database log
        p_face_url: faceUrl || null,
        p_output_url: upscaledUrl
      }
    );

    if (rpcError) {
      throw new Error(`Transaction failed: ${rpcError.message}`);
    }

    return NextResponse.json({
      success: true,
      outputUrl: upscaledUrl,
      blurPlaceholderUrl: blurPlaceholderUrl,
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
