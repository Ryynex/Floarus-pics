"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Sparkles, 
  Database, 
  Clock, 
  TrendingUp, 
  Settings, 
  UploadCloud, 
  RefreshCw, 
  ArrowRight,
  CheckCircle2,
  FileText,
  Key,
  ShieldAlert,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { GenerateWorkspace } from "@/components/GenerateWorkspace";

interface Profile {
  id: string;
  email: string | null;
  balance_inr: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "generate";

  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "fallback">("connecting");
  const [loading, setLoading] = useState(true);

  // Form State for Mock Generation
  const [prompt, setPrompt] = useState("");
  const [costEstimation, setCostEstimation] = useState(45.00);
  const [generating, setGenerating] = useState(false);
  const [generationOutput, setGenerationOutput] = useState<string | null>(null);

  // Check Supabase Connection & Get Session
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSessionActive(true);
          
          // Attempt real DB profile fetch
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email, balance_inr")
            .eq("id", session.user.id)
            .single();

          if (error) throw error;
          
          setProfile({
            id: session.user.id,
            email: data.email || session.user.email || null,
            balance_inr: Number(data.balance_inr),
          });
          setDbStatus("connected");
        } else {
          // Fallback guest session
          setSessionActive(false);
          setProfile({
            id: "guest-user-uuid",
            email: "guest.brand@maison.com",
            balance_inr: 450.00,
          });
          setDbStatus("fallback");
        }
      } catch (err) {
        console.error("Connection failed, using mock fallbacks:", err);
        setSessionActive(false);
        setProfile({
          id: "guest-user-uuid",
          email: "guest.brand@maison.com",
          balance_inr: 450.00,
        });
        setDbStatus("fallback");
      } finally {
        setLoading(false);
      }
    }
    
    checkSession();
  }, [currentTab]);

  // Simulate AI Fashion Generation
  const handleGenerateImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setGenerating(true);
    setGenerationOutput(null);

    // Simulate 3 seconds model rendering time
    setTimeout(() => {
      setGenerating(false);
      // Deduct simulated cost from balance
      if (profile) {
        setProfile({
          ...profile,
          balance_inr: Math.max(0, profile.balance_inr - costEstimation)
        });
      }
      setGenerationOutput("/images/model-fuchsia.png"); // Set output preview
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      
      {/* Upper Status & Greeting Section */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-surface border border-muted-purple/40 p-6 rounded-2xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome to Floarus Studio
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-fuchsia-accent/10 border border-fuchsia-accent/30 text-fuchsia-accent animate-pulse font-mono font-medium">B2B Portal</span>
          </h2>
          <p className="text-xs text-foreground-muted font-mono">
            Secure Session Key: <span className="text-zinc-500">{profile?.id}</span>
          </p>
        </div>

        {/* Database Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Supabase DB Link</span>
            <span className="text-xs font-semibold text-white">
              {dbStatus === "connected" ? "Sync Active" : dbStatus === "connecting" ? "Linking..." : "Local Sandbox fallback"}
            </span>
          </div>
          
          <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${
            dbStatus === "connected"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : dbStatus === "connecting"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400 animate-spin"
              : "border-purple-accent/30 bg-purple-accent/10 text-purple-accent"
          }`}>
            <Database className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Main Tab Routing Contents */}
      {currentTab === "generate" && (
        <GenerateWorkspace />
      )}

      {currentTab === "history" && (
        <section className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-muted-purple/30 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Model Catalog History</h3>
              <p className="text-xs text-foreground-muted">Track previously processed luxury renders and outputs.</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg border border-muted-purple bg-void/40 text-xs font-medium hover:text-white hover:border-fuchsia-accent/50 transition-all flex items-center gap-1.5 cursor-pointer">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {/* Simple history table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-muted-purple/40 text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Run Date</th>
                  <th className="py-3 px-4">Render Prompt</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Cost (INR)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted-purple/20 text-foreground-muted">
                {[
                  { date: "2026-07-08 16:32", prompt: "Fuchsia satin drape dress, black void background, editorial lighting", status: "completed", cost: "₹45.00" },
                  { date: "2026-07-08 14:15", prompt: "Avant-garde neon purple structured jacket on cybernetic model", status: "completed", cost: "₹45.00" },
                  { date: "2026-07-07 11:02", prompt: "Golden silk embroidery detailed cocktail dress", status: "failed", cost: "₹0.00" }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-void/25 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-white">{row.date}</td>
                    <td className="py-3 px-4 truncate max-w-xs">{row.prompt}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                        row.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">{row.cost}</td>
                    <td className="py-3 px-4 text-right">
                      {row.status === "completed" ? (
                        <button className="text-fuchsia-accent hover:underline cursor-pointer">View Render</button>
                      ) : (
                        <button className="text-zinc-600 disabled cursor-not-allowed">Unavailable</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {currentTab === "billing" && (
        <section className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-muted-purple/30 pb-4">
            <h3 className="text-base font-bold text-white">Billing & Financial Statements</h3>
            <p className="text-xs text-foreground-muted">Replenish your balance, inspect ledger rates, and configure card options.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Per-generation Fee</span>
              <span className="text-2xl font-black text-white">₹45.00 <span className="text-xs text-foreground-muted font-normal">/ render</span></span>
              <p className="text-[10px] text-foreground-muted mt-1 leading-relaxed">Flat GPU billing rate covering detailed 8K fabric synthesis runs.</p>
            </div>

            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Usage Period</span>
              <span className="text-2xl font-black text-white">July 2026</span>
              <p className="text-[10px] text-foreground-muted mt-1 leading-relaxed">Calculations cycle calendar monthly based on synthesis execution timestamps.</p>
            </div>

            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Payment method</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
                <CreditCardIconMock className="h-4.5 w-4.5 text-purple-accent" /> Mastercard •••• 9283
              </span>
              <p className="text-[10px] text-foreground-muted leading-relaxed">Simulated B2B corporate credit card account.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white">Replenishment Ledger</h4>
            <div className="bg-void/50 border border-muted-purple/40 rounded-xl overflow-hidden text-xs font-mono">
              <div className="grid grid-cols-3 p-3 border-b border-muted-purple/30 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                <span>Transaction Ref</span>
                <span>Replenish Value</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-muted-purple/20 text-foreground-muted">
                <div className="grid grid-cols-3 p-3">
                  <span>TX-18820938</span>
                  <span className="text-white font-bold">+₹1,000.00</span>
                  <span className="text-right text-emerald-400 font-bold">Settled</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span>TX-18754129</span>
                  <span className="text-white font-bold">+₹500.00</span>
                  <span className="text-right text-emerald-400 font-bold">Settled</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {currentTab === "settings" && (
        <section className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-muted-purple/30 pb-4">
            <h3 className="text-base font-bold text-white">Admin Settings & Integrations</h3>
            <p className="text-xs text-foreground-muted">Configure API tokens, GPU configurations, and account policies.</p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <Key className="h-4 w-4 text-purple-accent" /> B2B API Developer Key
              </h4>
              <p className="text-xs text-foreground-muted">Use this credentials key to automate garment rendering calls directly from your ERP inventory system.</p>
              
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="password"
                  disabled
                  value="fl_live_920387411a9f0e8d02c5c621"
                  className="bg-void/50 border border-muted-purple/60 px-3 py-2 rounded-lg text-xs font-mono text-zinc-500 w-full max-w-md"
                />
                <button className="px-3 py-2 rounded-lg border border-muted-purple text-xs font-semibold hover:border-purple-accent/60 cursor-pointer">
                  Reveal
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-muted-purple/30 pt-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-fuchsia-accent" /> Security Details
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                All image outputs are stored encrypted inside Supabase storage bucket, protected by Row Level Security (RLS) query constraints. Direct API tokens expire automatically every 180 days.
              </p>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// Fallback main view wrapper inside Suspense
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-8 max-w-5xl animate-pulse">
        <div className="h-24 bg-surface rounded-2xl border border-muted-purple/40" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-surface rounded-2xl border border-muted-purple/40" />
          <div className="lg:col-span-5 h-96 bg-surface rounded-2xl border border-muted-purple/40" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

// Minimal placeholder icons to reduce external file complexity
function ImageIconMock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function CreditCardIconMock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
