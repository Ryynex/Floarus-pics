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
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export function GenerateWorkspace() {
  // Input fields
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("2K");
  
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ cost: number; newBalance: number } | null>(null);

  // File Input Refs
  const sareeInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Costs
  const costEstimation = resolution === "4K" ? 10.00 : resolution === "2K" ? 2.50 : 1.00;

  // Handle saree flat-lay upload to Supabase bucket
  const handleSareeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSareeFile(file);
    setSareeUploading(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || "anonymous";
      const fileName = `${folder}/uploads/saree-${Date.now()}-${file.name}`;

      // Upload file directly to Supabase storage bucket
      const { data, error } = await supabase.storage
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
    } catch (err: any) {
      console.error("Saree upload error:", err);
      setErrorMsg(`Saree upload failed: ${err.message}`);
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
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || "anonymous";
      const fileName = `${folder}/uploads/face-${Date.now()}-${file.name}`;

      // Upload file directly to Supabase storage bucket
      const { data, error } = await supabase.storage
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
    } catch (err: any) {
      console.error("Face upload error:", err);
      setErrorMsg(`Face upload failed: ${err.message}`);
    } finally {
      setFaceUploading(false);
    }
  };

  // Execute Real Generation Pipeline Call
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sareeUrl) {
      setErrorMsg("Please upload a Saree Flat-lay image before rendering.");
      return;
    }

    setLoading(true);
    setLoadingStage(resolution === "4K" || resolution === "2K" ? "AI Studio: Fabricating & Cloud Upscaling..." : "AI Studio: Fabricating Layout (1K)...");
    setErrorMsg(null);
    setOutputUrl(null);
    setSuccessData(null);

    try {
      // Fetch active balance from Supabase or default mock
      let currentBalance = 450.00;
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession?.user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("balance_inr")
            .eq("id", activeSession.user.id)
            .single();
          if (!error && data) {
            currentBalance = Number(data.balance_inr);
          }
        }
      } catch (e) {
        console.error("Failed to fetch balance for submission:", e);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          sareeUrl,
          faceUrl,
          resolution, // Send actual selected resolution
          prompt,
          currentBalance
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Generation request failed");
      }

      setOutputUrl(result.outputUrl);
      setSuccessData({
        cost: result.cost,
        newBalance: result.newBalance
      });
      
      // Emit profile updated event to reload the sidebar wallet balance
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      console.error("Generation error:", err);
      setErrorMsg(err.message || "An unexpected error occurred during rendering.");
    } finally {
      setLoading(false);
      setLoadingStage("");
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

            {/* Input 4: Choose Resolution Dropdown */}
            <div className="flex flex-col gap-1.5 font-sans">
              <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                Choose Output Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as "1K" | "2K" | "4K")}
                className="w-full bg-surface border border-muted-purple/60 px-3 py-2.5 rounded-lg text-sm text-white focus:border-fuchsia-accent focus:outline-none"
              >
                <option value="1K">Standard 1K Resolution (Flat Rate: ₹1.00 per render)</option>
                <option value="2K">Hero 2K Resolution (Flat Rate: ₹2.50 per render)</option>
                <option value="4K">Luxury 4K Resolution (Flat Rate: ₹10.00 per render)</option>
              </select>
            </div>
            {/* Errors display */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex gap-2 items-start">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success cost deduction summary */}
            {successData && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex gap-2 items-start">
                <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Lookbook generated!</span>
                  <span className="font-mono">Deducted ₹{successData.cost.toFixed(2)}. Remaining Balance: ₹{successData.newBalance.toFixed(2)}.</span>
                </div>
              </div>
            )}

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
            <span className="text-zinc-500">{resolution} Mode</span>
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
                <img
                  src={outputUrl}
                  alt="OpenRouter Generative Output"
                  className="object-cover w-full h-full animate-fade-in"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="flex-1 py-2.5 rounded-lg border border-muted-purple/60 hover:border-fuchsia-accent/60 bg-void/50 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ImageIcon className="h-4 w-4" /> View Fullscreen
                </button>
                <a
                  href={outputUrl || undefined}
                  download={resolution === "4K" ? "floarus-lookbook-4k.png" : resolution === "2K" ? "floarus-lookbook-2k.png" : "floarus-lookbook-1k.png"}
                  className="flex-1 py-2.5 rounded-lg bg-fuchsia-accent hover:bg-fuchsia-accent/90 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="h-4 w-4" /> Download Asset
                </a>
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
            <span>Model: Gemini-3.1-Flash-Image</span>
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
              <span>HIGH-RESOLUTION RUNWAY PREVIEW ({resolution})</span>
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
              <a 
                href={outputUrl} 
                download={resolution === "4K" ? "floarus-lookbook-4k.png" : resolution === "2K" ? "floarus-lookbook-2k.png" : "floarus-lookbook-1k.png"}
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer text-[10px] uppercase tracking-wider"
              >
                <Download className="h-4 w-4" /> Save High-Res PNG
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
