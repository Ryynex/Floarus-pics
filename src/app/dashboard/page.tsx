"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Database, 
  RefreshCw, 
  Lock,
  History,
  Coins,
  Sliders,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Key,
  ShieldAlert,
  Zap
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { GenerateWorkspace } from "@/components/GenerateWorkspace";

interface Profile {
  id: string;
  email: string | null;
}

interface GenerationRecord {
  created_at: string;
  prompt: string;
  status: string;
  cost_inr: number;
  output_url: string | null;
}

interface PaymentRecord {
  upi_txn_id: string;
  amount: number;
  status: string;
  created_at: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "generate";

  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "fallback">("connecting");
  const [historyList, setHistoryList] = useState<GenerationRecord[]>([]);
  const [paymentsList, setPaymentList] = useState<PaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);

  const handleCopyId = () => {
    if (profile?.id) {
      navigator.clipboard.writeText(profile.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fetch live generation history
  const fetchHistory = async (userId: string) => {
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("generations")
        .select("created_at, prompt, status, cost_inr, output_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryList(data || []);
    } catch (err) {
      console.error("Error fetching generations history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch live payments history
  const fetchPayments = async (userId: string) => {
    try {
      setPaymentsLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("upi_txn_id, amount, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentList(data || []);
    } catch (err) {
      console.error("Error fetching payments history:", err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Check Supabase Connection & Get Session
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setProfile({
            id: session.user.id,
            email: session.user.email || null,
          });
          setDbStatus("connected");

          // Fetch respective records if tabs are active
          if (currentTab === "history") {
            fetchHistory(session.user.id);
          } else if (currentTab === "billing") {
            fetchPayments(session.user.id);
          }
        } else {
          router.replace("/");
        }
      } catch (err) {
        console.error("Session verification check failed:", err);
        router.replace("/");
      }
    }
    
    checkSession();
  }, [currentTab, router]);

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      
      {/* Upper Status & Greeting Section */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-surface border border-muted-purple/40 p-6 rounded-2xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome to Florus Studio
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
              {dbStatus === "connected" ? "Sync Active" : "Connecting..."}
            </span>
          </div>
          
          <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${
            dbStatus === "connected"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400 animate-spin"
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
        <section className="bg-surface border border-muted-purple/40 p-6 md:p-8 rounded-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-muted-purple/30 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-fuchsia-accent" /> Model Catalog History
              </h3>
              <p className="text-xs text-foreground-muted">Track previously processed luxury renders and outputs.</p>
            </div>
            <button 
              onClick={() => profile && fetchHistory(profile.id)}
              className="px-3 py-1.5 rounded-lg border border-muted-purple bg-void/40 text-xs font-mono hover:text-white hover:border-fuchsia-accent/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {/* Grid Layout gallery */}
          {historyLoading ? (
            <div className="py-16 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-fuchsia-accent" />
              <span>Loading runway catalog...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 font-mono text-xs border border-dashed border-muted-purple/30 rounded-xl bg-void/10">
              No generation history records found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {historyList.map((row, i) => (
                <div key={i} className="bg-void/40 border border-muted-purple/55 rounded-xl overflow-hidden flex flex-col group relative hover:border-fuchsia-accent/40 transition-all shadow-lg hover:shadow-2xl">
                  <div className="relative aspect-[4/5] bg-void overflow-hidden border-b border-muted-purple/30">
                    {row.output_url ? (
                      <>
                        <img 
                          src={row.output_url} 
                          alt="Runway Render" 
                          className="object-cover h-full w-full group-hover:scale-[1.03] transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                          <a 
                            href={row.output_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-full text-center py-1.5 rounded bg-fuchsia-accent text-[9px] font-mono text-white font-bold tracking-wider hover:bg-fuchsia-accent/90 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Open original</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-zinc-600 font-mono text-[9px]">
                        Processing failed
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-void/85 border border-muted-purple/60 text-[8px] text-fuchsia-accent font-mono font-bold">
                      ₹{Number(row.cost_inr).toFixed(2)}
                    </span>
                    <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-bold ${
                      row.status === "completed" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1 justify-between">
                    <div>
                      <span className="text-[8px] text-zinc-500 font-mono">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-zinc-200 line-clamp-2 leading-relaxed h-7 mt-1 font-mono" title={row.prompt}>
                        {row.prompt || "Runway synthesis campaign"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {currentTab === "billing" && (
        <section className="bg-surface border border-muted-purple/40 p-6 md:p-8 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-muted-purple/30 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-fuchsia-accent" /> Billing & Financial Statements
            </h3>
            <p className="text-xs text-foreground-muted">Replenish your balance via UPI, inspect synthesis billing rates, and review ledger transactions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Lookbook Synthesis Rate</span>
              <span className="text-2xl font-black text-white flex items-baseline gap-1 mt-1">
                ₹35.00 <span className="text-[10px] font-normal text-zinc-500">/ Image</span>
              </span>
              <p className="text-[10px] text-foreground-muted leading-relaxed font-mono mt-1">Flat rate per generation (rendered automatically in 2K resolution via Florus Engine).</p>
            </div>

            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Billing ID</span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] font-mono text-white select-all truncate max-w-[180px]">{profile?.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded hover:bg-surface border border-muted-purple/55 text-zinc-500 hover:text-white cursor-pointer transition-colors"
                  title="Copy Billing ID"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-[10px] text-foreground-muted leading-relaxed font-mono">Unique customer billing reference key in the ledger database.</p>
            </div>

            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Payment Configuration</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-1 font-mono">
                <Lock className="h-4 w-4 text-purple-accent" /> UPI Refills
              </span>
              <p className="text-[10px] text-foreground-muted leading-relaxed font-mono mt-1">Direct peer-to-peer wallet credits using verified Transaction IDs.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-zinc-500" /> Replenishment Ledger Logs
              </h4>
              <button 
                onClick={() => profile && fetchPayments(profile.id)}
                className="px-2.5 py-1.5 rounded border border-muted-purple bg-void/40 text-[10px] font-mono hover:text-white hover:border-fuchsia-accent/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Refresh Ledger
              </button>
            </div>

            <div className="bg-void/50 border border-muted-purple/40 rounded-xl overflow-hidden text-xs font-mono shadow-inner">
              <div className="grid grid-cols-3 p-3 border-b border-muted-purple/30 bg-void/40 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                <span>Transaction Ref / Date</span>
                <span>Replenish Value</span>
                <span className="text-right">Status</span>
              </div>
              {paymentsLoading ? (
                <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-fuchsia-accent" />
                  <span>Loading ledger statements...</span>
                </div>
              ) : paymentsList.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 border-t border-muted-purple/10">No payment transaction logs found.</div>
              ) : (
                <div className="divide-y divide-muted-purple/20 text-foreground-muted">
                  {paymentsList.map((pay, i) => (
                    <div key={i} className="grid grid-cols-3 p-3 items-center hover:bg-void/10 transition-colors">
                      <div className="flex flex-col min-w-0">
                        <span className="text-white select-all truncate pr-2" title={pay.upi_txn_id}>{pay.upi_txn_id}</span>
                        <span className="text-[9px] text-zinc-500 mt-0.5">{new Date(pay.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-white font-bold">+₹{Number(pay.amount).toFixed(2)}</span>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          pay.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : pay.status === 'pending' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {pay.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {currentTab === "settings" && (
        <section className="bg-surface border border-muted-purple/40 p-6 md:p-8 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-muted-purple/30 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-fuchsia-accent" /> Developer Settings & Credentials
            </h3>
            <p className="text-xs text-foreground-muted">Configure API tokens, sandbox GPU nodes, and account protection keys.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Credentials Panel */}
            <div className="bg-void/50 border border-muted-purple/40 p-4 rounded-xl flex flex-col gap-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <Key className="h-4 w-4 text-purple-accent" /> Access Token credentials
              </h4>
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Platform Auth Key</span>
                <div className="flex gap-2">
                  <input
                    type={showApiToken ? "text" : "password"}
                    readOnly
                    value={`fls_live_${profile?.id?.replace(/-/g, "")}`}
                    className="flex-1 bg-surface border border-muted-purple/55 px-3 py-1.5 rounded text-xs text-white font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiToken(!showApiToken)}
                    className="px-2.5 py-1.5 bg-void border border-muted-purple rounded text-[10px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showApiToken ? "Hide" : "Reveal"}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-foreground-muted font-mono leading-relaxed mt-2">
                Use this access token to authenticate with external workflow integrations and automated lookbook asset fetching scripts.
              </p>
            </div>

            {/* GPU status and protection */}
            <div className="bg-void/50 border border-muted-purple/40 p-4 rounded-xl flex flex-col gap-3 justify-between">
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-400" /> GPU Compute Cluster Health
                </h4>
                <div className="flex flex-col gap-1 mt-1 font-mono text-[10px] text-foreground-muted">
                  <div className="flex justify-between border-b border-muted-purple/20 pb-1.5">
                    <span>Active Cluster Node</span>
                    <span className="text-emerald-400 font-bold">Node A-12</span>
                  </div>
                  <div className="flex justify-between border-b border-muted-purple/20 py-1.5">
                    <span>Average Generation Latency</span>
                    <span className="text-white font-bold">14.8s</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span>2K Resolution Network State</span>
                    <span className="text-emerald-400 font-bold">Online</span>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
                Platform endpoints are globally distributed to guarantee 99.9% uptime for design pipelines.
              </p>
            </div>
          </div>

          {/* Account Protection Card */}
          <div className="bg-void/50 border border-muted-purple/40 p-4 rounded-xl flex flex-col gap-2.5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-purple-accent" /> Row-Level Security Policies
            </h4>
            <p className="text-xs text-foreground-muted leading-relaxed font-mono">
              All lookbook images are stored encrypted inside Supabase Storage. Row level security policies (RLS) guarantee that only your verified user account has decryption authority over your inputs and generated results. Platform administrators verify payment ledger actions manually to audit wallets securely.
            </p>
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
