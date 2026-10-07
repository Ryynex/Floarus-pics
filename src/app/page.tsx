"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  ArrowRight,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  Cpu,
  Palette,
  Sparkles,
  Image as ImageIcon,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  // Authentication Form State
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check for active session on initial load and auto-redirect to dashboard
  React.useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          router.replace("/dashboard");
          return;
        }
      } catch (err) {
        console.warn("Session verification note:", err);
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkSession();

    // Subscribe to auth state changes for immediate redirection upon login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Interactive Product Showcase State: Real Mannequin to Florus AI Model
  const [showcaseView, setShowcaseView] = useState<"split" | "after" | "before">("split");

  // Policy Modals State
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Handle Authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!normalizedEmail || !cleanPassword) {
      setMessage({ type: "error", text: "Please provide both email and password." });
      setLoading(false);
      return;
    }

    if (cleanPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      setLoading(false);
      return;
    }

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: `Verified! Redirecting to Florus Studio...`,
        });
        router.replace("/dashboard");
      } else {
        // Sign up with additional metadata
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: cleanPassword,
          options: {
            data: {
              company_name: company.trim() || "Brand Client",
            },
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Account registered! If confirmation is required, please check your inbox.",
        });
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1500);
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full bg-void flex flex-col items-center justify-center gap-4 text-ink">
        <div className="flex items-center gap-3">
          <img src="/images/florus_logo.png" alt="Florus Logo" className="h-9 w-9 object-contain animate-pulse" />
          <span className="text-base font-bold tracking-[0.18em] text-ink">
            FLORUS<span className="text-fuchsia-accent">.</span>PICS
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="h-4 w-4 border-2 border-fuchsia-accent/30 border-t-fuchsia-accent rounded-full animate-spin" />
          <span>Verifying security session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-void">
      {/* Subtle warm header wash */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-clay-soft/60 via-void to-void pointer-events-none" />

      {/* Brand Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-7 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img src="/images/florus_logo.png" alt="Florus Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-[0.18em] text-ink">
              FLORUS<span className="text-fuchsia-accent">.</span>PICS
            </span>
            <span className="text-[9px] sm:text-[10px] font-medium tracking-wide text-ink-faint">AI Fashion Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-ink-soft">
          <span className="hidden sm:inline text-xs font-medium">B2B Platform</span>
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          <span className="text-[11px] sm:text-xs font-medium text-sage">Systems Online</span>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-10 items-center z-10">

        {/* Left Column: Product Showcase */}
        <section className="lg:col-span-7 flex flex-col gap-5 sm:gap-7 text-left">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-surface max-w-fit">
              <Cpu className="h-3.5 w-3.5 text-fuchsia-accent" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-fuchsia-accent">Generative AI for Fashion Catalogs</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-ink leading-[1.15] sm:max-w-2xl">
              Studio-grade model shoots from{" "}
              <span className="text-fuchsia-accent">shop mannequins & fabrics</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-ink-soft max-w-xl leading-relaxed">
              Florus converts raw headless mannequin and unstitched saree photos into publication-grade editorial model lookbooks with flawless hands, natural smiles, and authentic Indian drape physics.
            </p>
          </div>

          {/* Real AI Conversion Showcase */}
          <div className="card p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 max-w-xl">
            <div className="flex items-center justify-between border-b border-line pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-fuchsia-accent" />
                <span className="text-xs font-bold text-ink">Real Transformation Showcase</span>
              </div>
              <span className="pill-success px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide">
                Florus AI Powered
              </span>
            </div>

            {/* Interactive Showcase Screen */}
            <div className="relative aspect-[4/5] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-sand border border-line shadow-2xl">
              {showcaseView === "split" ? (
                <div className="grid grid-cols-2 h-full w-full">
                  {/* Left: Raw Mannequin Input */}
                  <div className="relative h-full border-r border-line/80 overflow-hidden group">
                    <Image
                      src="/images/mannequin_saree_input.jpg"
                      alt="Raw Mannequin Saree Photo (Input)"
                      fill
                      sizes="(max-width: 768px) 50vw, 280px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                    <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/75 backdrop-blur-md border border-white/10 px-2 sm:px-2.5 py-0.5 rounded-full">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-wide text-rose-300">INPUT · Mannequin</span>
                    </div>
                  </div>

                  {/* Right: Florus AI Model Output */}
                  <div className="relative h-full overflow-hidden group">
                    <Image
                      src="/images/output_flux2_pro.jpg"
                      alt="Florus AI Editorial Model (Output)"
                      fill
                      sizes="(max-width: 768px) 50vw, 280px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                    <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-fuchsia-accent/90 backdrop-blur-md px-2 sm:px-2.5 py-0.5 rounded-full shadow-lg">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-wide text-white">OUTPUT · Florus AI</span>
                    </div>
                  </div>
                </div>
              ) : showcaseView === "before" ? (
                <div className="relative h-full w-full group">
                  <Image
                    src="/images/mannequin_saree_input.jpg"
                    alt="Raw Mannequin Saree Photo"
                    fill
                    sizes="(max-width: 768px) 100vw, 576px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    priority
                  />
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/80 backdrop-blur-md border border-white/10 px-2.5 sm:px-3 py-1 rounded-full">
                    <span className="text-[11px] sm:text-xs font-semibold text-rose-300">RAW INPUT: Headless Shop Mannequin Photo</span>
                  </div>
                </div>
              ) : (
                <div className="relative h-full w-full group">
                  <Image
                    src="/images/output_flux2_pro.jpg"
                    alt="Florus AI Editorial Indian Model"
                    fill
                    sizes="(max-width: 768px) 100vw, 576px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    priority
                  />
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-fuchsia-accent/90 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full shadow-lg">
                    <span className="text-[11px] sm:text-xs font-semibold text-white">OUTPUT: Florus AI Editorial Model</span>
                  </div>
                </div>
              )}

              {/* Bottom Floating Stats Tag */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 flex justify-between items-center gap-2 pointer-events-none">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-surface/95 backdrop-blur-md border border-line px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-fuchsia-accent" />
                  <div className="flex flex-col">
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-ink-faint">Real Conversion</span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-ink">Mannequin ➔ Model</span>
                  </div>
                </div>
                <div className="bg-surface/95 backdrop-blur-md border border-line px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg flex flex-col items-end">
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-ink-faint">Catalog Rate</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-fuchsia-accent">₹49 / image</span>
                </div>
              </div>
            </div>

            {/* Showcase Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
              <button
                type="button"
                onClick={() => setShowcaseView("split")}
                className={`py-2 px-1.5 sm:px-3 rounded-xl border font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  showcaseView === "split"
                    ? "border-fuchsia-accent/50 bg-clay-soft text-fuchsia-accent shadow-sm"
                    : "border-line bg-surface text-ink-soft hover:border-fuchsia-accent/30 hover:text-ink"
                }`}
              >
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="truncate">Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setShowcaseView("after")}
                className={`py-2 px-1.5 sm:px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showcaseView === "after"
                    ? "border-fuchsia-accent/50 bg-clay-soft text-fuchsia-accent shadow-sm"
                    : "border-line bg-surface text-ink-soft hover:border-fuchsia-accent/30 hover:text-ink"
                }`}
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="truncate">Model (After)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowcaseView("before")}
                className={`py-2 px-1.5 sm:px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showcaseView === "before"
                    ? "border-fuchsia-accent/50 bg-clay-soft text-fuchsia-accent shadow-sm"
                    : "border-line bg-surface text-ink-soft hover:border-fuchsia-accent/30 hover:text-ink"
                }`}
              >
                <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="truncate">Mannequin</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Auth Card */}
        <section className="lg:col-span-5 flex justify-center">
          <div className="card w-full max-w-md p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="pill-success text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Secure Portal
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-ink mt-1">
                {authMode === "login" ? "Sign in to your studio" : "Create a brand account"}
              </h2>
              <p className="text-sm text-ink-soft leading-relaxed">
                {authMode === "login"
                  ? "Access your generate workspace, catalog history, and wallet."
                  : "Start generating professional catalog photoshoots for your label."}
              </p>
            </div>

            {/* Auth Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-sand rounded-xl">
              <button
                onClick={() => { setAuthMode("login"); setMessage(null); }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("signup"); setMessage(null); }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === "signup"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink"
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
                  <label className="label-caps">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Milan Digital Atelier"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="input-field pl-9"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="label-caps">Business Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="partner@fashionbrand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="label-caps">Password</label>
                  {authMode === "login" && (
                    <span className="text-[11px] font-medium text-fuchsia-accent">Contact support to reset</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none z-10" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-9 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-faint hover:text-ink hover:bg-sand/80 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Form Feedback Messages */}
              {message && (
                <div className={`p-3 rounded-xl border text-sm font-medium flex gap-2 items-start ${
                  message.type === "success"
                    ? "bg-sage-soft border-sage/25 text-sage"
                    : "bg-brick-soft border-brick/25 text-brick"
                }`}>
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{message.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-1 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-[#1F1A15]/40 border-t-[#1F1A15] rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{authMode === "login" ? "Open Studio" : "Create Account"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-line pt-4 text-center">
              <span className="text-xs text-ink-faint flex justify-center items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sage" /> Secure authentication powered by Supabase
              </span>
            </div>
          </div>
        </section>

      </main>

      {/* Trust strip */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 border-t border-line flex flex-col items-center gap-2.5 sm:gap-3 select-none z-10 text-center">
        <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.2em] text-ink-faint uppercase">Trusted by design houses & digital retailers</span>
        <div className="flex flex-wrap justify-center items-center gap-x-6 sm:gap-x-10 gap-y-2 sm:gap-y-3 text-[11px] sm:text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase opacity-80">
          <span>Milan Couture</span>
          <span className="text-line">•</span>
          <span>Maison de Rêve</span>
          <span className="text-line">•</span>
          <span>Tokyo Runway</span>
          <span className="text-line">•</span>
          <span>Prada Digital Dept</span>
        </div>
      </section>

      {/* Feature Highlights Footer */}
      <footer className="w-full border-t border-line bg-sand/50 py-8 sm:py-10 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

          <div className="flex gap-3.5 sm:gap-4">
            <div className="h-10 w-10 rounded-xl bg-surface border border-line flex items-center justify-center flex-shrink-0">
              <Cpu className="h-5 w-5 text-fuchsia-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">High-Resolution Output</h3>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
                Generate crisp catalog-ready images with fabric detail preserved.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 sm:gap-4">
            <div className="h-10 w-10 rounded-xl bg-surface border border-line flex items-center justify-center flex-shrink-0">
              <Palette className="h-5 w-5 text-purple-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Diverse Model Library</h3>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
                Match garments with a wide range of personas — or upload your brand&apos;s own model.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 sm:gap-4">
            <div className="h-10 w-10 rounded-xl bg-surface border border-line flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-5 w-5 text-fuchsia-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Controlled Studio Settings</h3>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
                Choose poses, backgrounds, hairstyles, and jewellery for every shoot.
              </p>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 pt-4 border-t border-line flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-xs text-ink-faint text-center md:text-left">
          <span>&copy; {new Date().getFullYear()} Florus.pics Inc. All rights reserved.</span>
          <div className="flex gap-5 sm:gap-6">
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-ink transition-colors cursor-pointer bg-transparent border-none p-0 text-xs font-medium text-ink-faint"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setShowTerms(true)}
              className="hover:text-ink transition-colors cursor-pointer bg-transparent border-none p-0 text-xs font-medium text-ink-faint"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-8 animate-fade-in" onClick={() => setShowPrivacy(false)}>
          <div className="max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] bg-surface border border-line rounded-xl sm:rounded-2xl p-4 sm:p-6 relative flex flex-col gap-4 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-ink tracking-wide">PRIVACY POLICY</h3>
              <button onClick={() => setShowPrivacy(false)} className="p-1 rounded-md hover:bg-sand text-ink-faint hover:text-ink cursor-pointer transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 text-xs sm:text-sm text-ink-soft leading-relaxed flex flex-col gap-3 sm:gap-4">
              <p className="text-[11px] sm:text-xs text-ink-faint">Effective Date: July 14, 2026</p>
              <h4 className="text-ink font-semibold">1. Information We Collect</h4>
              <p>Florus.pics collects business email addresses, company metadata, and encrypted credentials to establish secure B2B authentication keys. Any uploaded design files, fabric sketches, or model face pictures are temporarily uploaded to Supabase Storage solely for processing runway synthesis campaigns and can be deleted on-demand by the user.</p>

              <h4 className="text-ink font-semibold">2. Use of Information</h4>
              <p>We process reference design layouts through our generative AI pipelines to render high-resolution assets. We do not use your proprietary catalog inputs or generated design lookbooks to train our foundation models or sell them to third parties.</p>

              <h4 className="text-ink font-semibold">3. Data Security and Custody</h4>
              <p>All database logs, wallets, ledger statements, and profile data are protected behind Supabase row-level security policies (RLS). Payment tracking is logged via transaction IDs and manually verified by the platform administrators to prevent unauthorized credits.</p>

              <h4 className="text-ink font-semibold">4. Customer Control and Rights</h4>
              <p>Users maintain absolute ownership of their digital catalogs and synthesized design images. You may request account deletion or execute full deletion of temporary workspace assets at any time via the user control panel.</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-8 animate-fade-in" onClick={() => setShowTerms(false)}>
          <div className="max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] bg-surface border border-line rounded-xl sm:rounded-2xl p-4 sm:p-6 relative flex flex-col gap-4 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-ink tracking-wide">TERMS OF SERVICE</h3>
              <button onClick={() => setShowTerms(false)} className="p-1 rounded-md hover:bg-sand text-ink-faint hover:text-ink cursor-pointer transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 text-xs sm:text-sm text-ink-soft leading-relaxed flex flex-col gap-3 sm:gap-4">
              <p className="text-[11px] sm:text-xs text-ink-faint">Effective Date: July 14, 2026</p>
              <h4 className="text-ink font-semibold">1. B2B Account and Usage License</h4>
              <p>Florus.pics is a specialized business-to-business platform granting non-exclusive, revocable rights to upload design assets and render high-resolution model lookbook designs. Users are solely responsible for ensuring they possess rights to all input graphics and model face references submitted.</p>

              <h4 className="text-ink font-semibold">2. Wallet Balances and Manual UPI Refills</h4>
              <p>Generation services are charged at a flat rate of ₹49.00 INR per successful output. Wallet top-ups are processed manually: users submit their transaction IDs or UTR numbers, which must be verified and approved by the system administrators before wallet credit is incremented. All balance amounts are non-refundable.</p>

              <h4 className="text-ink font-semibold">3. Generation Policies and AI Disclaimers</h4>
              <p>Generative services are provided on an &quot;as-is&quot; basis using cloud-hosted GPU endpoints. Output quality may fluctuate based on reference complexity, prompts, and server loads. Florus.pics does not guarantee exact color matching for industrial textile manufacturing.</p>

              <h4 className="text-ink font-semibold">4. Prohibited Content and Terminations</h4>
              <p>We strictly prohibit the upload of offensive, harassing, or copyright-infringing content. The administration reserves the right to freeze wallets and terminate user sessions for violating platform guidelines or attempting policy exploitation.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
