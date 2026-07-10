"use client";

import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  UploadCloud, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  ImageIcon, 
  Download,
  AlertCircle,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export function GenerateWorkspace() {
  // Input fields
  const [prompt, setPrompt] = useState("");
  const [resolution] = useState<"1K">("1K");
  
  // Upload states
  const [sareeFile, setSareeFile] = useState<File | null>(null);
  const [sareeUrl, setSareeUrl] = useState<string | null>(null);
  const [sareeUploading, setSareeUploading] = useState(false);

  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Progressive Image Loading States
  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurPlaceholderUrl, setBlurPlaceholderUrl] = useState<string | null>(null);

  // Floating Toast Stack System State
  interface Toast {
    id: string;
    type: "success" | "error" | "info";
    message: string;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now().toString() + Math.random().toString().substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // File Input Refs
  const sareeInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Costs
  const costEstimation = 6.00;

  // Handle saree flat-lay upload to Supabase bucket
  const handleSareeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSareeFile(file);
    setSareeUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized: Session is required");
      const folder = session.user.id;
      const fileName = `${folder}/uploads/saree-${Date.now()}-${file.name}`;

      // Upload file directly to Supabase storage bucket
      const { error } = await supabase.storage
        .from("generated-lookbooks")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from("generated-lookbooks")
        .getPublicUrl(fileName);

      setSareeUrl(publicUrl);
      addToast("success", "Saree sketch uploaded successfully!");
    } catch (err) {
      console.error("Saree upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error during upload";
      addToast("error", `Saree upload failed: ${errMsg}`);
    } finally {
      setSareeUploading(false);
    }
  };

  // Handle reference face upload to Supabase bucket
  const handleFaceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaceFile(file);
    setFaceUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized: Session is required");
      const folder = session.user.id;
      const fileName = `${folder}/uploads/face-${Date.now()}-${file.name}`;

      // Upload file directly to Supabase storage bucket
      const { error } = await supabase.storage
        .from("generated-lookbooks")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from("generated-lookbooks")
        .getPublicUrl(fileName);

      setFaceUrl(publicUrl);
      addToast("success", "Face reference uploaded successfully!");
    } catch (err) {
      console.error("Face upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error during upload";
      addToast("error", `Face upload failed: ${errMsg}`);
    } finally {
      setFaceUploading(false);
    }
  };

  // Execute Real Generation Pipeline Call
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sareeUrl) {
      addToast("error", "Please upload a Saree Flat-lay image before rendering.");
      return;
    }

    setLoading(true);
    setLoadingStage("AI Studio: Fabricating Runway Asset & AI Upscaling...");
    setOutputUrl(null);
    setBlurPlaceholderUrl(null);
    setImageLoaded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token || ""}`
        },
        body: JSON.stringify({
          sareeUrl,
          faceUrl,
          resolution: "1K", // Send standard 1K resolution to API
          prompt
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Generation request failed");
      }

      setOutputUrl(result.outputUrl);
      setBlurPlaceholderUrl(result.blurPlaceholderUrl);
      addToast("success", `Lookbook generated! Deducted ₹${result.cost.toFixed(2)}. Remaining Balance: ₹${result.newBalance.toFixed(2)}.`);
      
      // Emit profile updated event to reload the sidebar wallet balance
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Generation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during rendering.";
      addToast("error", errMsg);
    } finally {
      // Clear input images from client state as they are cleaned up in Supabase Storage
      setSareeFile(null);
      setSareeUrl(null);
      setFaceFile(null);
      setFaceUrl(null);

      setLoading(false);
      setLoadingStage("");
    }
  };

  // Byte-lossless download handler to fetch original file bytes from Supabase
  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lossless download failed, falling back to direct navigation:", err);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = filename;
      link.click();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      
      {/* Left Column: Saree Inputs Control */}
      <section className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-surface border border-muted-purple/40 p-6 md:p-8 rounded-2xl flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 border-b border-muted-purple/30 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-accent" /> AI Runway Lookbook Generator
            </h3>
            <p className="text-xs text-foreground-muted">
              Supply your design flat-lay and target models to execute high-fashion generative compositions.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-5">
            
            {/* Input 1: Saree Flat-lay upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                Product Saree Flat-lay <span className="text-red-500">*</span>
              </label>
              
              <input
                type="file"
                accept="image/*"
                ref={sareeInputRef}
                onChange={handleSareeUpload}
                className="hidden"
              />

              {sareeUrl ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-fuchsia-accent/30 bg-void flex items-center justify-between p-4 group">
                  <div className="relative h-24 w-20 rounded border border-muted-purple bg-surface overflow-hidden">
                    <img src={sareeUrl} alt="Saree Upload" className="object-cover h-full w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 px-4 min-w-0">
                    <span className="text-xs text-white font-semibold truncate">{sareeFile?.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Uploaded to Supabase
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSareeFile(null); setSareeUrl(null); }}
                    className="px-3 py-1 bg-void/80 border border-muted-purple rounded-lg text-[10px] text-foreground-muted hover:text-white cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => sareeInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer bg-void/30 ${
                    sareeUploading 
                      ? "border-fuchsia-accent bg-fuchsia-accent/5 animate-pulse" 
                      : "border-muted-purple/60 hover:border-fuchsia-accent/50 hover:bg-void/50"
                  }`}
                >
                  <UploadCloud className="h-8 w-8 text-foreground-muted animate-bounce" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">
                      {sareeUploading ? "Uploading fabric..." : "Upload Saree Sketch / Photo"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">Supports PNG, JPG up to 5MB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input 2: Optional Model Face upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                Reference Model Face (Optional)
              </label>
              
              <input
                type="file"
                accept="image/*"
                ref={faceInputRef}
                onChange={handleFaceUpload}
                className="hidden"
              />

              {faceUrl ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-purple-accent/30 bg-void flex items-center justify-between p-4">
                  <div className="relative h-24 w-20 rounded border border-muted-purple bg-surface overflow-hidden">
                    <img src={faceUrl} alt="Face Reference" className="object-cover h-full w-full" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 px-4 min-w-0">
                    <span className="text-xs text-white font-semibold truncate">{faceFile?.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Uploaded to Supabase
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFaceFile(null); setFaceUrl(null); }}
                    className="px-3 py-1 bg-void/80 border border-muted-purple rounded-lg text-[10px] text-foreground-muted hover:text-white cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => faceInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer bg-void/30 ${
                    faceUploading 
                      ? "border-purple-accent bg-purple-accent/5 animate-pulse" 
                      : "border-muted-purple/60 hover:border-purple-accent/50 hover:bg-void/50"
                  }`}
                >
                  <UploadCloud className="h-8 w-8 text-foreground-muted" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">
                      {faceUploading ? "Uploading face reference..." : "Upload Specific Model Face"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">Leaves face to random if empty</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input 3: Prompt Guidance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                Creative Theme & Background Guidance
              </label>
              <textarea
                rows={3}
                placeholder="Describe lighting mood, style options, setting background, jewelry ornaments details..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-void/50 border border-muted-purple/60 px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:border-fuchsia-accent focus:outline-none resize-none"
              />
            </div>

            {/* Resolution and upscale notice info badge */}
            <div className="flex flex-col gap-2 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                  Output Resolution Pipeline
                </span>
                <span className="text-[10px] font-semibold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  4K AI Upscaling Active
                </span>
              </div>
              
              <div className="bg-void/50 border border-muted-purple/40 rounded-xl p-3.5 flex flex-col gap-1 text-[11px] leading-relaxed text-foreground-muted font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-accent shrink-0 animate-pulse" />
                  <span>Generates in 1K and upscales instantly via Cloudinary AI.</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-accent shrink-0" />
                  <span>Deduction cost is set to a flat rate of <strong>₹6.00</strong>.</span>
                </div>
              </div>
            </div>



            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading || sareeUploading || faceUploading}
              className="w-full py-3.5 mt-2 rounded-lg bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 glow-btn-fuchsia cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  <span>{loadingStage}</span>
                </>
              ) : (
                <>
                  <span>Generate Lookbook Asset (₹{costEstimation.toFixed(2)})</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Right Column: Output Canvas Display */}
      <section className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-4 min-h-[450px] justify-between relative overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-center text-xs font-mono border-b border-muted-purple/30 pb-3">
            <span className="text-foreground-muted flex items-center gap-1.5">
              Synthesis Viewer
            </span>
            <span className="text-zinc-500">4K Upscaled Mode</span>
          </div>

          {/* Core frame with dotted border */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
              <div className="relative h-14 w-14 flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-accent/30 opacity-75 animate-ping" />
                <Sparkles className="h-7 w-7 text-fuchsia-accent animate-pulse" />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Processing Canvas</span>
                <span className="text-[10px] text-zinc-500 font-mono">{loadingStage}</span>
              </div>
            </div>
          ) : outputUrl ? (
            <div className="flex-1 flex flex-col gap-4">
              <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden border border-muted-purple/50 bg-void">
                {/* 1. Low-res blurred background placeholder */}
                {blurPlaceholderUrl && (
                  <img
                    src={blurPlaceholderUrl}
                    alt="Blurred preview"
                    className="absolute inset-0 object-cover w-full h-full filter blur-md scale-105 transition-opacity duration-500"
                    style={{ opacity: imageLoaded ? 0 : 1 }}
                  />
                )}
                {/* 2. High-res output image with smooth 500ms opacity cross-fade when loaded */}
                <img
                  src={outputUrl}
                  alt="Upscaled Runway Output"
                  onLoad={() => setImageLoaded(true)}
                  className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ease-in-out"
                  style={{ opacity: imageLoaded ? 1 : 0 }}
                />
                
                {/* Tiny absolute loading label overlay if image is loading */}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-xs">
                    <div className="flex items-center gap-2 bg-void/80 border border-muted-purple/60 px-3 py-1.5 rounded-lg text-[10px] text-foreground-muted font-mono animate-pulse">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-fuchsia-accent" />
                      <span>Loading HD Asset...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="flex-1 py-2.5 rounded-lg border border-muted-purple/60 hover:border-fuchsia-accent/60 bg-void/50 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ImageIcon className="h-4 w-4" /> View Fullscreen
                </button>
                <button
                  type="button"
                  onClick={() => downloadImage(outputUrl, "floarus-lookbook-4k.png")}
                  className="flex-1 py-2.5 rounded-lg bg-fuchsia-accent hover:bg-fuchsia-accent/90 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="h-4 w-4" /> Download Asset
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-muted-purple/40 rounded-xl bg-void/20">
              <div className="h-12 w-12 rounded-xl bg-surface border border-muted-purple/60 flex items-center justify-center text-zinc-600 mb-2">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-white">Output Runway Canvas</span>
              <p className="text-[10px] text-foreground-muted max-w-[240px] leading-relaxed">
                Provide fabric flat-lays, set prompts, and launch engine to synthesize photorealistic runway catalogs.
              </p>
            </div>
          )}

          {/* Footer Info */}
          <div className="border-t border-muted-purple/30 pt-4 flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>Model: Gemini-3.1-Flash-Lite (Cloudinary AI Upscaled)</span>
            <span>GPU Nodes Active</span>
          </div>

        </div>
      </section>

      {/* Lightbox fullscreen overlay */}
      {showLightbox && outputUrl && (
        <div 
          className="fixed inset-0 z-50 bg-void/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col justify-between items-center" onClick={(e) => e.stopPropagation()}>
            {/* Lightbox Header */}
            <div className="w-full flex justify-between items-center text-xs font-mono text-zinc-400 py-2 border-b border-muted-purple/30 mb-4">
              <span>HIGH-RESOLUTION RUNWAY PREVIEW (4K AI Upscaled)</span>
              <button 
                onClick={() => setShowLightbox(false)}
                className="px-3 py-1 bg-surface border border-muted-purple text-[10px] text-white rounded-md hover:border-fuchsia-accent cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 w-full relative flex items-center justify-center overflow-auto rounded-2xl border border-muted-purple bg-void p-2">
              <img 
                src={outputUrl} 
                alt="High-Res Runway Composition" 
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Lightbox Footer Actions */}
            <div className="w-full flex justify-between items-center mt-4 pt-4 border-t border-muted-purple/30 text-xs font-mono">
              <span className="text-zinc-500">Press download to save uncompressed source</span>
              <button 
                type="button"
                onClick={() => downloadImage(outputUrl, "floarus-lookbook-4k.png")}
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer text-[10px] uppercase tracking-wider"
              >
                <Download className="h-4 w-4" /> Save High-Res PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border flex items-start gap-3 shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-x-0 animate-fade-in ${
              toast.type === "success"
                ? "bg-emerald-950/85 border-emerald-500/40 text-emerald-300"
                : toast.type === "error"
                ? "bg-red-950/85 border-red-500/40 text-red-300"
                : "bg-void/85 border-purple-accent/40 text-purple-300"
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {toast.type === "success" ? (
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
              ) : toast.type === "error" ? (
                <AlertCircle className="h-4.5 w-4.5 text-red-400" />
              ) : (
                <Sparkles className="h-4.5 w-4.5 text-purple-400" />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-[11px] font-mono leading-relaxed">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-zinc-500 hover:text-white flex-shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
