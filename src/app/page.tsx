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
  Image as ImageIcon,
  X
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

  // Policy Modals State
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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
        const { error } = await supabase.auth.signUp({
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setMessage({
        type: "error",
        text: errorMsg,
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

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      
      {/* Brand Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 md:py-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <img src="/images/florus_logo.png" alt="Florus Logo" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold tracking-[0.25em] text-white">
            FLORUS<span className="text-fuchsia-accent">.</span>PICS
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
              Florus.pics delivers premium studio-grade AI generation for luxury fashion catalogs. Transform designs from fabric sketches to photorealistic digital campaigns instantly.
            </p>
          </div>

          {/* Interactive Outfit Switching Container */}
          <div className="border border-muted-purple/40 bg-surface/40 p-4 rounded-2xl flex flex-col gap-4 max-w-xl shadow-2xl relative overflow-hidden backdrop-blur-sm">
            {/* Window control mock header */}
            <div className="flex items-center justify-between border-b border-muted-purple/30 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500/50" />
                <span className="h-2 w-2 rounded-full bg-yellow-500/50" />
                <span className="h-2 w-2 rounded-full bg-emerald-500/50" />
                <span className="text-[10px] font-mono text-zinc-500 ml-2">virtual_campaign_simulation.ini</span>
              </div>
              <span className="text-fuchsia-accent text-[10px] font-mono tracking-widest">{showcaseResolution}</span>
            </div>

            {/* Model Preview Screen */}
            <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden bg-void border border-muted-purple/40 group">
              <Image 
                src={showcaseOutfit === "fuchsia" ? "/images/model-fuchsia.png" : "/images/model-purple.png"} 
                alt="AI Fashion Model Showcase" 
                fill 
                sizes="(max-width: 768px) 100vw, 576px"
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
          <div className="w-full max-w-md glassmorphic-card rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
            
            {/* Upper Accent Light Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-accent/60 to-transparent" />
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-fuchsia-accent/5 to-transparent rounded-full blur-xl pointer-events-none" />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold font-mono tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                  Secure Portal
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-1">
                {authMode === "login" ? "B2B Brand Sign In" : "Register Partnership"}
              </h2>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-mono">
                {authMode === "login" 
                  ? "Access your digital lookbook workbench and ledger logs." 
                  : "Begin launching automated HD runway shoots for your design house."}
              </p>
            </div>

            {/* Auth Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-void/90 border border-muted-purple/60 rounded-xl relative z-10">
              <button
                onClick={() => { setAuthMode("login"); setMessage(null); }}
                className={`py-2 text-xs font-mono tracking-wider rounded-lg transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-muted-purple text-white shadow-lg border border-purple-accent/20"
                    : "text-foreground-muted hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("signup"); setMessage(null); }}
                className={`py-2 text-xs font-mono tracking-wider rounded-lg transition-all cursor-pointer ${
                  authMode === "signup"
                    ? "bg-muted-purple text-white shadow-lg border border-purple-accent/20"
                    : "text-foreground-muted hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="flex flex-col gap-4 relative z-10">
              
              {/* Optional Company Field for Register */}
              {authMode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Milan digital atelier"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-void/60 border border-muted-purple/60 px-9 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-accent/50 focus:ring-1 focus:ring-fuchsia-accent/20 focus:shadow-[0_0_15px_rgba(236,72,153,0.08)] transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="partner@fashionbrand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-void/60 border border-muted-purple/60 px-9 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-accent/50 focus:ring-1 focus:ring-fuchsia-accent/20 focus:shadow-[0_0_15px_rgba(236,72,153,0.08)] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
                    Security Key
                  </label>
                  {authMode === "login" && (
                    <a href="#" className="text-[9px] font-mono text-fuchsia-accent hover:underline uppercase tracking-wider">
                      Reset Key?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-void/60 border border-muted-purple/60 px-9 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-accent/50 focus:ring-1 focus:ring-fuchsia-accent/20 focus:shadow-[0_0_15px_rgba(236,72,153,0.08)] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
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

      {/* B2B Trust strip */}
      <section className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-muted-purple/15 flex flex-col items-center gap-3 select-none z-10">
        <span className="text-[9px] font-mono tracking-[0.3em] text-zinc-600 uppercase">Trusted by high-end design houses & digital retailers</span>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 text-xs font-mono tracking-widest text-zinc-500 uppercase mt-1 opacity-70">
          <span>MILAN COUTURE</span>
          <span>•</span>
          <span>Maison de Rêve</span>
          <span>•</span>
          <span>TOKYO RUNWAY</span>
          <span>•</span>
          <span>PRADA DIGITAL DEPT</span>
        </div>
      </section>

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
          <span>&copy; {new Date().getFullYear()} Florus.pics Inc. All rights reserved. B2B AI Luxury.</span>
          <div className="flex gap-6">
            <button 
              onClick={() => setShowPrivacy(true)} 
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-xs font-mono text-zinc-500"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => setShowTerms(true)} 
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-xs font-mono text-zinc-500"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-void/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in" onClick={() => setShowPrivacy(false)}>
          <div className="max-w-2xl w-full max-h-[80vh] bg-surface border border-muted-purple/60 rounded-2xl p-6 relative flex flex-col gap-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-muted-purple/40 pb-3">
              <h3 className="text-sm font-bold text-white tracking-wider font-mono">PRIVACY POLICY</h3>
              <button onClick={() => setShowPrivacy(false)} className="p-1 rounded-md hover:bg-void/40 text-zinc-500 hover:text-white cursor-pointer transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 text-xs text-foreground-muted font-mono leading-relaxed flex flex-col gap-4">
              <p className="text-[10px] text-zinc-500">Effective Date: July 14, 2026</p>
              <h4 className="text-white font-semibold uppercase">1. Information We Collect</h4>
              <p>Florus.pics collects business email addresses, company metadata, and encrypted credentials to establish secure B2B authentication keys. Any uploaded design files, fabric sketches, or model face pictures are temporarily uploaded to Supabase Storage solely for processing runway synthesis campaigns and can be deleted on-demand by the user.</p>
              
              <h4 className="text-white font-semibold uppercase">2. Use of Information</h4>
              <p>We process reference design layouts through our generative AI pipelines to render 2K resolution assets. We do not use your proprietary catalog inputs or generated design lookbooks to train our foundation models or sell them to third parties.</p>

              <h4 className="text-white font-semibold uppercase">3. Data Security and Custody</h4>
              <p>All database logs, wallets, ledger statements, and profile data are protected behind Supabase row-level security policies (RLS). Payment tracking is logged via transaction IDs and manually verified by the platform administrators to prevent unauthorized credits.</p>

              <h4 className="text-white font-semibold uppercase">4. Customer Control and Rights</h4>
              <p>Users maintain absolute ownership of their digital catalogs and synthesized design images. You may request account deletion or execute full deletion of temporary workspace assets at any time via the user control panel.</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-void/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in" onClick={() => setShowTerms(false)}>
          <div className="max-w-2xl w-full max-h-[80vh] bg-surface border border-muted-purple/60 rounded-2xl p-6 relative flex flex-col gap-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-muted-purple/40 pb-3">
              <h3 className="text-sm font-bold text-white tracking-wider font-mono">TERMS OF SERVICE</h3>
              <button onClick={() => setShowTerms(false)} className="p-1 rounded-md hover:bg-void/40 text-zinc-500 hover:text-white cursor-pointer transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 text-xs text-foreground-muted font-mono leading-relaxed flex flex-col gap-4">
              <p className="text-[10px] text-zinc-500">Effective Date: July 14, 2026</p>
              <h4 className="text-white font-semibold uppercase">1. B2B Account and Usage License</h4>
              <p>Florus.pics is a specialized business-to-business platform granting non-exclusive, revocable rights to upload design assets and render high-resolution model lookbook designs. Users are solely responsible for ensuring they possess rights to all input graphics and model face references submitted.</p>
              
              <h4 className="text-white font-semibold uppercase">2. Wallet Balances and Manual UPI Refills</h4>
              <p>Generation services are charged at a flat rate of ₹35.00 INR per successful 2K resolution output. Wallet top-ups are processed manually: users submit their transaction IDs or UTR numbers, which must be verified and approved by the system administrators before wallet credit is incremented. All balance amounts are non-refundable.</p>

              <h4 className="text-white font-semibold uppercase">3. Generation Policies and AI Disclaimers</h4>
              <p>Generative services are provided on an "as-is" basis using cloud-hosted GPU endpoints. Output quality may fluctuate based on reference complexity, prompts, and server loads. Florus.pics does not guarantee exact color matching for industrial textile manufacturing.</p>

              <h4 className="text-white font-semibold uppercase">4. Prohibited Content and Terminations</h4>
              <p>We strictly prohibit the upload of offensive, harassing, or copyright-infringing content. The administration reserves the right to freeze wallets and terminate user sessions for violating platform guidelines or attempting policy exploitation.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
