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
  Download,
  Loader2,
  FileText,
  Key,
  ShieldAlert,
  Zap
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { GenerateWorkspace } from "@/components/GenerateWorkspace";
import { MagicModeWorkspace } from "@/components/MagicModeWorkspace";

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

function statusPillClass(status: string) {
  if (status === "completed") return "pill-success";
  if (status === "pending" || status === "processing") return "pill-warning";
  return "pill-danger";
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
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const downloadImage = async (url: string, filename: string) => {
    try {
      setDownloadingUrl(url);
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
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloadingUrl(null);
    }
  };

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
    <div className="flex flex-col gap-4 sm:gap-6 max-w-5xl">

      {/* Upper Status & Greeting Section */}
      <section className="card p-4 sm:p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-ink">
              Welcome to Florus Studio
            </h2>
            <span className="pill-neutral text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-semibold">B2B Workspace</span>
          </div>
          <p className="text-[11px] sm:text-xs text-ink-faint truncate">
            Account ID: <span className="select-all text-ink-soft">{profile?.id}</span>
          </p>
        </div>

        {/* Database Status Badge */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="label-caps">Supabase DB</span>
            <span className="text-xs sm:text-sm font-semibold text-ink">
              {dbStatus === "connected" ? "Connected" : "Connecting..."}
            </span>
          </div>

          <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center ${
            dbStatus === "connected"
              ? "border-sage/30 bg-sage-soft text-sage"
              : "border-amber-warm/30 bg-amber-soft text-amber-warm"
          }`}>
            <Database className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </section>

      {/* Main Tab Routing Contents */}
      {currentTab === "generate" && (
        <GenerateWorkspace />
      )}

      {currentTab === "magic" && (
        <MagicModeWorkspace />
      )}

      {currentTab === "history" && (
        <section className="card p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
          <div className="flex justify-between items-center border-b border-line pb-4 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-accent" /> Catalog History
              </h3>
              <p className="text-xs sm:text-sm text-ink-soft mt-0.5">Browse previously generated model photoshoots.</p>
            </div>
            <button
              onClick={() => profile && fetchHistory(profile.id)}
              className="btn-secondary px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {/* Grid Layout gallery */}
          {historyLoading ? (
            <div className="py-12 sm:py-16 text-center text-ink-faint text-sm flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-fuchsia-accent" />
              <span>Loading your catalog...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-ink-faint text-xs sm:text-sm border border-dashed border-line rounded-xl bg-sand/40 px-4">
              No generations yet. Create your first lookbook from the Generate tab.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
              {historyList.map((row, i) => (
                <div key={i} className="card card-hover overflow-hidden flex flex-col group relative">
                  <div className="relative aspect-[4/5] bg-sand overflow-hidden border-b border-muted-purple">
                    {row.output_url ? (
                      <>
                        <img
                          src={row.output_url}
                          alt="Generated Lookbook"
                          className="object-cover h-full w-full group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 sm:p-2.5 gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={() => downloadImage(row.output_url!, `florus-catalog-${i + 1}.png`)}
                            disabled={downloadingUrl === row.output_url}
                            className="btn-primary flex-1 text-center py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-md disabled:opacity-60"
                            title="Direct download full size image"
                          >
                            {downloadingUrl === row.output_url ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            <span>{downloadingUrl === row.output_url ? "Saving..." : "Download"}</span>
                          </button>
                          <a
                            href={row.output_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 bg-surface/90 hover:bg-surface text-ink shrink-0"
                            title="Open full size in new tab"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-ink-faint text-xs font-medium">
                        No output
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-1.5 sm:px-2 py-0.5 rounded-md bg-surface/95 border border-line text-[9px] sm:text-[10px] text-ink font-semibold flex items-center gap-1">
                      <Coins className="h-2.5 w-2.5 text-fuchsia-accent" />
                      <span>1 Credit</span>
                    </span>
                    <span className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold capitalize ${statusPillClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="p-2 sm:p-3 flex flex-col gap-1 flex-1 justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] sm:text-[10px] text-ink-faint">
                          {new Date(row.created_at).toLocaleDateString()}
                        </span>
                        {row.output_url && (
                          <button
                            type="button"
                            onClick={() => downloadImage(row.output_url!, `florus-catalog-${i + 1}.png`)}
                            disabled={downloadingUrl === row.output_url}
                            className="text-[10px] sm:text-xs font-semibold text-fuchsia-accent hover:text-fuchsia-accent/80 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Direct download full size image"
                          >
                            {downloadingUrl === row.output_url ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            )}
                            <span className="text-[10px] sm:text-xs">Download</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-ink-soft line-clamp-2 leading-tight sm:leading-relaxed mt-0.5 sm:mt-1" title={row.prompt}>
                        {row.prompt || "Catalog generation"}
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
        <section className="card p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
          <div className="border-b border-line pb-4">
            <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-accent" /> Billing & Payments
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft mt-0.5">Top up your wallet via UPI and review your transaction ledger.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-2">
              <span className="label-caps">Generation Rate</span>
              <span className="text-xl sm:text-2xl font-bold text-ink flex items-baseline gap-1.5 mt-0.5 sm:mt-1">
                1 Credit <span className="text-xs font-medium text-ink-faint">/ lookbook</span>
              </span>
              <p className="text-xs text-ink-soft leading-relaxed">Flat 1 Credit rate per 4MP lookbook generated through the Florus AI engine.</p>
            </div>

            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-2">
              <span className="label-caps">Billing ID</span>
              <div className="flex justify-between items-center mt-0.5 sm:mt-1 gap-2">
                <span className="text-xs font-medium text-ink select-all truncate">{profile?.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="btn-secondary p-1.5 rounded-md cursor-pointer shrink-0"
                  title="Copy Billing ID"
                >
                  {copied ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">Your unique reference key for wallet transactions.</p>
            </div>

            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-2 sm:col-span-2 md:col-span-1">
              <span className="label-caps">Payment Method</span>
              <span className="text-sm font-bold text-ink flex items-center gap-1.5 mt-0.5 sm:mt-1">
                <Lock className="h-4 w-4 text-purple-accent" /> UPI Top-Up
              </span>
              <p className="text-xs text-ink-soft leading-relaxed">Manual wallet credits via verified UPI transaction IDs.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs sm:text-sm font-semibold text-ink flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-ink-faint" /> Payment Ledger
              </h4>
              <button
                onClick={() => profile && fetchPayments(profile.id)}
                className="btn-secondary px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full data-table text-xs">
                  <thead>
                    <tr>
                      <th>Transaction / Date</th>
                      <th>Amount</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsLoading ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-ink-faint">
                          <span className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-fuchsia-accent" />
                            Loading ledger...
                          </span>
                        </td>
                      </tr>
                    ) : paymentsList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-ink-faint">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      paymentsList.map((pay, i) => (
                        <tr key={i}>
                          <td>
                            <div className="flex flex-col min-w-0">
                              <span className="text-ink font-medium select-all truncate max-w-[140px] sm:max-w-none pr-2" title={pay.upi_txn_id}>{pay.upi_txn_id}</span>
                              <span className="text-[10px] text-ink-faint mt-0.5">{new Date(pay.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="text-ink font-semibold whitespace-nowrap">
                            <span className="text-sm font-bold text-fuchsia-accent">
                              +{(Number(pay.amount) / 49).toFixed(1)} Credits
                            </span>
                          </td>
                          <td className="text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusPillClass(pay.status)}`}>
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {currentTab === "settings" && (
        <section className="card p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
          <div className="border-b border-line pb-4">
            <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
              <Sliders className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-accent" /> Settings & Credentials
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft mt-0.5">Review platform access keys and account security details.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Account Credentials Panel */}
            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                <Key className="h-4 w-4 text-purple-accent" /> Access Token
              </h4>
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="label-caps">Platform Auth Key</span>
                <div className="flex gap-2">
                  <input
                    type={showApiToken ? "text" : "password"}
                    readOnly
                    value={`fls_live_${profile?.id?.replace(/-/g, "")}`}
                    className="input-field flex-1 text-xs select-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiToken(!showApiToken)}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0"
                  >
                    {showApiToken ? "Hide" : "Reveal"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed mt-1">
                Use this key when integrating Florus with external automation or asset-fetching scripts.
              </p>
            </div>

            {/* GPU status and protection */}
            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-3 justify-between">
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-sage" /> Engine Status
                </h4>
                <div className="flex flex-col gap-1 mt-1 text-xs text-ink-soft">
                  <div className="flex justify-between border-b border-muted-purple pb-1.5">
                    <span>Active Cluster Node</span>
                    <span className="text-sage font-semibold">Node A-12</span>
                  </div>
                  <div className="flex justify-between border-b border-muted-purple py-1.5">
                    <span>Average Latency</span>
                    <span className="text-ink font-semibold">14.8s</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span>Network State</span>
                    <span className="text-sage font-semibold">Online</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Platform endpoints are distributed globally for reliable generation performance.
              </p>
            </div>
          </div>

          {/* Account Protection Card */}
          <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-purple-accent" /> Data Protection
            </h4>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Lookbook images are stored in Supabase Storage with row-level security policies, so only your account can access your inputs and generated results. Payment ledger actions are verified manually by administrators.
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
      <div className="flex flex-col gap-6 max-w-5xl animate-pulse">
        <div className="h-24 card" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 card" />
          <div className="lg:col-span-5 h-96 card" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
