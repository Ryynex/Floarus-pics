"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Cpu, 
  Palette, 
  Image as ImageIcon 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  // Authentication Form State
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Interactive Product Showcase State
  const [showcaseOutfit, setShowcaseOutfit] = useState<"fuchsia" | "purple">("fuchsia");
  const [showcaseResolution, setShowcaseResolution] = useState("8K UHD");
  const [showcaseModel, setShowcaseModel] = useState("AI Model V2.4");

  // Handle Authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: `Successfully logged in as ${data.user?.email}. Welcome back! Redirecting to studio...`,
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        // Sign up with additional metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: company,
            },
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Registration initiated! Check your email for validation link.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-void">
      
      {/* Background Radial Glow Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-accent/10 blur-[120px] pointer-events-none" />
      
      {/* Brand Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 md:py-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-fuchsia-accent to-purple-accent flex items-center justify-center shadow-lg shadow-fuchsia-accent/25">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-[0.25em] text-white">
            FLOARUS<span className="text-fuchsia-accent">.</span>PICS
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-foreground-muted">
          <span className="hidden sm:inline-block">B2B Portal v2.0</span>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-mono uppercase text-emerald-400">Systems Active</span>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
        
        {/* Left Column: Premium Interactive AI Showcase */}
        <section className="lg:col-span-7 flex flex-col gap-8 text-left">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-muted-purple bg-surface/50 max-w-fit">
              <Cpu className="h-3.5 w-3.5 text-fuchsia-accent" />
              <span className="text-xs uppercase tracking-widest text-fuchsia-accent font-semibold">Luxury GenAI Fashion Engine</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] sm:max-w-2xl">
              Elevate Your Fashion Line with <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-accent via-pink-400 to-purple-accent">Virtual Runway Models</span>
            </h1>
            <p className="text-base md:text-lg text-foreground-muted max-w-xl leading-relaxed">
              Floarus.pics delivers premium studio-grade AI generation for luxury fashion catalogs. Transform designs from fabric sketches to photorealistic digital campaigns instantly.
            </p>
          </div>

          {/* Interactive Outfit Switching Container */}
          <div className="border border-muted-purple/40 bg-surface/40 p-4 rounded-2xl flex flex-col gap-4 max-w-xl shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="flex justify-between items-center text-xs font-mono border-b border-muted-purple/40 pb-3">
              <span className="text-foreground-muted flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-purple-accent" /> Showcase Output
              </span>
              <span className="text-fuchsia-accent tracking-widest">{showcaseResolution}</span>
            </div>

            {/* Model Preview Screen */}
            <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden bg-void border border-muted-purple/40 group">
              <Image 
                src={showcaseOutfit === "fuchsia" ? "/images/model-fuchsia.png" : "/images/model-purple.png"} 
                alt="AI Fashion Model Showcase" 
                fill 
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                priority
              />
              
              {/* Floating tags */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="flex flex-col gap-1 bg-void/85 border border-muted-purple/60 backdrop-blur-md px-3 py-2 rounded-lg text-[10px] font-mono">
                  <span className="text-[9px] text-foreground-muted uppercase">Model Engine</span>
                  <span className="text-white font-semibold">{showcaseModel}</span>
                </div>
                <div className="flex flex-col gap-1 bg-void/85 border border-muted-purple/60 backdrop-blur-md px-3 py-2 rounded-lg text-[10px] font-mono items-end">
                  <span className="text-[9px] text-foreground-muted uppercase">Fabric Synthesis</span>
                  <span className="text-fuchsia-accent font-semibold uppercase">{showcaseOutfit} Satin Silk</span>
                </div>
              </div>
            </div>

            {/* Showcase Selector Tabs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button 
                onClick={() => {
                  setShowcaseOutfit("fuchsia");
                  setShowcaseModel("AI Model V2.4");
                  setShowcaseResolution("8K UHD");
                }}
                className={`py-2.5 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showcaseOutfit === "fuchsia"
                    ? "border-fuchsia-accent/50 bg-fuchsia-accent/15 text-white shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                    : "border-muted-purple bg-void/40 text-foreground-muted hover:text-white"
                }`}
              >
                <Palette className="h-3.5 w-3.5" /> fuchsia outfit
              </button>
              <button 
                onClick={() => {
                  setShowcaseOutfit("purple");
                  setShowcaseModel("AI Model V3.1");
                  setShowcaseResolution("12K IMAX");
                }}
                className={`py-2.5 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showcaseOutfit === "purple"
                    ? "border-purple-accent/50 bg-purple-accent/15 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : "border-muted-purple bg-void/40 text-foreground-muted hover:text-white"
                }`}
              >
                <Palette className="h-3.5 w-3.5" /> purple outfit
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Stunning Glassmorphic Login/Register Card */}
        <section className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md glassmorphic-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative">
            
            {/* Upper Accent Light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-accent/50 to-transparent" />
            
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {authMode === "login" ? "Partner Sign In" : "Register Organization"}
              </h2>
              <p className="text-xs text-foreground-muted">
                {authMode === "login" 
                  ? "Access your studio dashboard and view current campaigns." 
                  : "Begin launching automated high-fashion shoots for your brand."}
              </p>
            </div>

            {/* Auth Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-void/85 border border-muted-purple/60 rounded-xl">
              <button
                onClick={() => { setAuthMode("login"); setMessage(null); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-surface text-white border border-muted-purple/40 shadow-md"
                    : "text-foreground-muted hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("signup"); setMessage(null); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === "signup"
                    ? "bg-surface text-white border border-muted-purple/40 shadow-md"
                    : "text-foreground-muted hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              
              {/* Optional Company Field for Register */}
              {authMode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Maison de L'Amour"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-void/50 border border-muted-purple/60 px-9 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 glow-input"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                  <input
                    type="email"
                    required
                    placeholder="partner@fashionbrand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-void/50 border border-muted-purple/60 px-9 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 glow-input"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                    Security Key
                  </label>
                  {authMode === "login" && (
                    <a href="#" className="text-[10px] text-fuchsia-accent hover:underline">
                      Forgot?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-void/50 border border-muted-purple/60 px-9 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 glow-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Form Feedback Messages */}
              {message && (
                <div className={`p-3 rounded-lg border text-xs font-medium flex gap-2 items-start ${
                  message.type === "success" 
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400" 
                    : "bg-red-500/10 border-red-500/35 text-red-400"
                }`}>
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{message.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 rounded-lg bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 glow-btn-fuchsia cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{authMode === "login" ? "Initialize Studio Dashboard" : "Create Partnership Portal"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-muted-purple/40 pt-4 text-center">
              <span className="text-[10px] font-mono text-zinc-500 flex justify-center items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Fully Encrypted SSL Auth | Powered by Supabase
              </span>
            </div>

          </div>
        </section>

      </main>

      {/* Grid Feature Highlights Footer */}
      <footer className="w-full border-t border-muted-purple/40 bg-surface/20 py-8 z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-lg bg-surface border border-muted-purple/60 flex items-center justify-center flex-shrink-0">
              <Cpu className="h-5 w-5 text-fuchsia-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">8K Texture Generation</h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Generate high-resolution fabric textures showing exact material thread details.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-lg bg-surface border border-muted-purple/60 flex items-center justify-center flex-shrink-0">
              <Palette className="h-5 w-5 text-purple-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Global Model Diversity</h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Instantly match garments with a highly custom, diverse portfolio of virtual model renders.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-lg bg-surface border border-muted-purple/60 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-5 w-5 text-fuchsia-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Studio Lighting Control</h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Adjust lighting setups, shadows, and environment moods post-generation dynamically.
              </p>
            </div>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-4 border-t border-muted-purple/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-500">
          <span>&copy; {new Date().getFullYear()} Floarus.pics Inc. All rights reserved. B2B AI Luxury.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Developer API</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
