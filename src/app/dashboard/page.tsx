"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Database, 
  RefreshCw, 
  Lock
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
        <section className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-muted-purple/30 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Model Catalog History</h3>
              <p className="text-xs text-foreground-muted">Track previously processed luxury renders and outputs.</p>
            </div>
            <button 
              onClick={() => profile && fetchHistory(profile.id)}
              className="px-3 py-1.5 rounded-lg border border-muted-purple bg-void/40 text-xs font-medium hover:text-white hover:border-fuchsia-accent/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {/* Real history table */}
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="py-8 text-center text-zinc-500 font-mono text-xs">Loading history catalog...</div>
            ) : historyList.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 font-mono text-xs">No generation history records found.</div>
            ) : (
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
                  {historyList.map((row, i) => (
                    <tr key={i} className="hover:bg-void/25 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-white">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 truncate max-w-xs">{row.prompt || "Simulated Saree Campaign"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                          row.status === "completed" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">₹{Number(row.cost_inr).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        {row.output_url ? (
                          <a 
                            href={row.output_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-fuchsia-accent hover:underline cursor-pointer"
                          >
                            View Render
                          </a>
                        ) : (
                          <span className="text-zinc-600">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {currentTab === "billing" && (
        <section className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-muted-purple/30 pb-4">
            <h3 className="text-base font-bold text-white">Billing & Financial Statements</h3>
            <p className="text-xs text-foreground-muted">Replenish your balance via UPI, inspect synthesis billing rates, and review ledger transactions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Lookbook Synthesis Rate</span>
              <span className="text-2xl font-black text-white">
                ₹37.00
              </span>
              <p className="text-[10px] text-foreground-muted mt-1 leading-relaxed">Flat rate per generation (upscaled automatically to HD resolution via Cloudinary AI).</p>
            </div>

            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Billing ID</span>
              <span className="text-sm font-mono text-white select-all truncate mt-1">{profile?.id}</span>
              <p className="text-[10px] text-foreground-muted leading-relaxed">Unique customer billing reference key in the ledger database.</p>
            </div>

            <div className="bg-void/50 border border-muted-purple/50 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Payment Configuration</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
                <Lock className="h-4 w-4 text-purple-accent" /> Manual UPI Replenishment
              </span>
              <p className="text-[10px] text-foreground-muted leading-relaxed">Direct peer-to-peer wallet credits using verified Transaction IDs.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white">Replenishment History</h4>
              <button 
                onClick={() => profile && fetchPayments(profile.id)}
                className="px-2 py-1 rounded border border-muted-purple bg-void/40 text-[10px] font-medium hover:text-white hover:border-fuchsia-accent/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            <div className="bg-void/50 border border-muted-purple/40 rounded-xl overflow-hidden text-xs font-mono">
              <div className="grid grid-cols-3 p-3 border-b border-muted-purple/30 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                <span>Transaction Ref / Date</span>
                <span>Replenish Value</span>
                <span className="text-right">Status</span>
              </div>
              {paymentsLoading ? (
                <div className="p-4 text-center text-zinc-500">Loading payments ledger...</div>
              ) : paymentsList.length === 0 ? (
                <div className="p-4 text-center text-zinc-500">No payment transaction logs found.</div>
              ) : (
                <div className="divide-y divide-muted-purple/20 text-foreground-muted">
                  {paymentsList.map((pay, i) => (
                    <div key={i} className="grid grid-cols-3 p-3 items-center hover:bg-void/10 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-white select-all">{pay.upi_txn_id}</span>
                        <span className="text-[9px] text-zinc-500 mt-0.5">{new Date(pay.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-white font-bold">+₹{Number(pay.amount).toFixed(2)}</span>
                      <span className={`text-right font-bold uppercase ${
                        pay.status === 'completed' 
                          ? 'text-emerald-400' 
                          : pay.status === 'pending' 
                          ? 'text-amber-400 animate-pulse' 
                          : 'text-red-400'
                      }`}>
                        {pay.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {currentTab === "settings" && (
        <section className="bg-surface border border-muted-purple/40 p-6 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-muted-purple/30 pb-4">
            <h3 className="text-base font-bold text-white">Admin Settings & Integrations</h3>
            <p className="text-xs text-foreground-muted">Configure API tokens, GPU configurations, and account security.</p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-purple-accent" /> Account Protection
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                All image outputs are stored encrypted inside the Supabase storage bucket, protected by user-isolated Row Level Security (RLS) policies. Direct access is audited per generation request.
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
