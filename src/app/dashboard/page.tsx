"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
  Zap,
  Search,
  Maximize2,
  X,
  Sparkles,
  ImageIcon
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { clearAuthCookie } from "@/lib/authCookie";
import { creditsFromBalance, CREDIT_PRICE_INR } from "@/lib/pricing";
import { GenerateWorkspace } from "@/components/GenerateWorkspace";
import { MagicModeWorkspace } from "@/components/MagicModeWorkspace";
import { FlatlayStudioWorkspace } from "@/components/FlatlayStudioWorkspace";

interface Profile {
  id: string;
  email: string | null;
}

interface GenerationRecord {
  id?: string;
  created_at: string;
  prompt: string;
  status: string;
  cost_inr: number;
  output_url: string | null;
}

interface PaymentRecord {
  id?: string;
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
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // History Tab Enhanced Filtering & Lightbox States
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(24);
  const [lightboxRecord, setLightboxRecord] = useState<GenerationRecord | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

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

  // Fetch live generation history (useCallback keeps the identity stable so the
  // auth/data effect above does not re-run on every render)
  const fetchHistory = useCallback(async (userId: string) => {
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("generations")
        .select("id, created_at, prompt, status, cost_inr, output_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setHistoryList(data || []);
    } catch (err) {
      console.error("Error fetching generations history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch live payments history
  const fetchPayments = useCallback(async (userId: string) => {
    try {
      setPaymentsLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("id, upi_txn_id, amount, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setPaymentList(data || []);
    } catch (err) {
      console.error("Error fetching payments history:", err);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Check Supabase Connection & Get Session
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          setProfile({
            id: user.id,
            email: user.email || null,
          });
          setDbStatus("connected");

          const { data: balRow } = await supabase
            .from("profiles")
            .select("balance_inr")
            .eq("id", user.id)
            .single();
          if (!cancelled && balRow) {
            setWalletBalance(Number(balRow.balance_inr));
          }

          // Fetch respective records if tabs are active
          if (currentTab === "history") {
            fetchHistory(user.id);
          } else if (currentTab === "billing") {
            fetchPayments(user.id);
          }
        } else if (!error) {
          clearAuthCookie();
          router.replace("/");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Session verification check failed:", err);
        clearAuthCookie();
        router.replace("/");
      }
    }

    checkSession();

    // Keep the settings wallet figure in sync after a generation spends credits
    const onProfileUpdated = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("balance_inr")
        .eq("id", user.id)
        .single();
      if (!cancelled && data) setWalletBalance(Number(data.balance_inr));
    };
    window.addEventListener("profile-updated", onProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("profile-updated", onProfileUpdated);
    };
  }, [currentTab, router, fetchHistory, fetchPayments]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl">

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

      {currentTab === "flatlay" && (
        <FlatlayStudioWorkspace />
      )}

      {currentTab === "history" && (() => {
        const filteredHistory = historyList.filter((row) => {
          const q = historySearch.toLowerCase().trim();
          const matchesSearch = !q || (row.prompt && row.prompt.toLowerCase().includes(q));
          const matchesStatus = historyStatusFilter === "all" || row.status === historyStatusFilter;
          return matchesSearch && matchesStatus;
        });
        const displayedHistory = filteredHistory.slice(0, visibleHistoryCount);

        return (
          <section className="card p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6 shadow-xl">
            {/* Header & Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-fuchsia-accent/10 border border-fuchsia-accent/30 flex items-center justify-center text-fuchsia-accent shrink-0">
                    <History className="h-4 w-4" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-ink">
                    Editorial Catalog History
                  </h3>
                  <span className="pill-success text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {historyList.length} {historyList.length === 1 ? "Shoot" : "Shoots"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-ink-soft mt-1">
                  Browse, zoom, download, and copy links for all your AI synthesized model lookbooks.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => profile && fetchHistory(profile.id)}
                  disabled={historyLoading}
                  className="btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin text-fuchsia-accent" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-sand/60 p-2.5 sm:p-3 rounded-xl border border-line">
              {/* Search by prompt */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search shoots by prompt keywords (e.g. silk, banarasi, red, palace)..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setVisibleHistoryCount(24);
                  }}
                  className="input-field text-xs pl-9 pr-8 py-2 w-full"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
                {[
                  { id: "all", label: `All (${historyList.length})` },
                  { id: "completed", label: "Completed" },
                  { id: "processing", label: "Processing" },
                  { id: "failed", label: "Failed" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setHistoryStatusFilter(tab.id);
                      setVisibleHistoryCount(24);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      historyStatusFilter === tab.id
                        ? "bg-fuchsia-accent text-white shadow-sm"
                        : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-line-hover"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gallery Grid */}
            {historyLoading ? (
              <div className="py-16 sm:py-20 text-center text-ink-faint text-sm flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-fuchsia-accent/10 border border-fuchsia-accent/30 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-fuchsia-accent" />
                </div>
                <span className="font-semibold text-ink">Syncing catalog gallery...</span>
                <span className="text-xs text-ink-faint">Loading high-resolution asset history</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-14 sm:py-18 text-center text-ink-soft text-xs sm:text-sm border-2 border-dashed border-line rounded-2xl bg-sand/30 p-6 flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-surface border border-line flex items-center justify-center shadow-xs">
                  <ImageIcon className="h-6 w-6 text-fuchsia-accent" />
                </div>
                <div className="flex flex-col gap-1 max-w-sm">
                  <span className="font-bold text-ink text-sm">
                    {historySearch ? "No matching lookbooks found" : "No catalog shoots yet"}
                  </span>
                  <p className="text-xs text-ink-soft">
                    {historySearch
                      ? `No shoots matched "${historySearch}". Try clearing your search filter.`
                      : "Generate your first editorial saree or custom model lookbook to build your collection."}
                  </p>
                </div>
                {historySearch ? (
                  <button
                    type="button"
                    onClick={() => setHistorySearch("")}
                    className="btn-secondary text-xs px-3.5 py-1.5 rounded-xl cursor-pointer mt-1"
                  >
                    Clear Filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard?tab=generate")}
                    className="btn-primary text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md mt-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Create Lookbook</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 smooth-scroll-grid">
                  {displayedHistory.map((row, i) => (
                    <div
                      key={row.id || `${row.created_at}-${i}`}
                      className="card card-hover overflow-hidden flex flex-col group relative bg-surface border border-line hover:border-fuchsia-accent/50 transition-all shadow-md img-perf-card rounded-2xl"
                    >
                      {/* Image Canvas with 4:5 Aspect Ratio */}
                      <div className="relative aspect-[4/5] bg-sand overflow-hidden border-b border-line">
                        {row.output_url ? (
                          <>
                            <img
                              src={row.output_url}
                              alt={row.prompt || "Generated Lookbook"}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.src = "/images/florus_logo.png";
                              }}
                              className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                              onClick={() => setLightboxRecord(row)}
                            />

                            {/* Hover Overlay with Action Buttons */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 sm:p-3 z-10 pointer-events-none group-hover:pointer-events-auto">
                              {/* Top Bar inside overlay */}
                              <div className="flex items-center justify-between">
                                <span className="bg-black/70 backdrop-blur-xs text-white text-[9px] font-semibold px-2 py-0.5 rounded-md border border-white/10">
                                  {new Date(row.created_at).toLocaleDateString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLightboxRecord(row)}
                                  className="p-1.5 rounded-lg bg-surface/90 hover:bg-surface text-ink transition-transform hover:scale-105 cursor-pointer shadow-sm"
                                  title="Fullscreen Zoom"
                                >
                                  <Maximize2 className="h-3.5 w-3.5 text-fuchsia-accent" />
                                </button>
                              </div>

                              {/* Bottom Action Buttons */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => downloadImage(row.output_url!, `florus-catalog-${i + 1}.png`)}
                                  disabled={downloadingUrl === row.output_url}
                                  className="btn-primary flex-1 text-center py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-md disabled:opacity-60"
                                  title="Download Full-Res"
                                >
                                  {downloadingUrl === row.output_url ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                  <span>{downloadingUrl === row.output_url ? "Saving..." : "Download"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyUrl(row.output_url!)}
                                  className="p-1.5 sm:p-2 rounded-lg bg-surface/90 hover:bg-surface text-ink cursor-pointer transition-colors shrink-0 shadow-sm"
                                  title="Copy Image Link"
                                >
                                  {copiedUrl === row.output_url ? (
                                    <Check className="h-3.5 w-3.5 text-sage" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>

                                <a
                                  href={row.output_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 sm:p-2 rounded-lg bg-surface/90 hover:bg-surface text-ink cursor-pointer transition-colors shrink-0 shadow-sm"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-ink-faint text-xs font-medium">
                            No asset
                          </div>
                        )}

                        {/* Always visible Top-Right Status Badge */}
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm z-5 ${statusPillClass(row.status)}`}>
                          {row.status}
                        </span>

                        {/* Always visible Bottom-Left Credit Pill */}
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur-xs border border-line text-[9px] text-ink font-bold flex items-center gap-1 shadow-sm z-5">
                          <Coins className="h-2.5 w-2.5 text-fuchsia-accent" />
                          <span>1 Credit</span>
                        </span>
                      </div>

                      {/* Card Details Footer */}
                      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-1.5">
                        <p className="text-[11px] sm:text-xs text-ink line-clamp-2 leading-relaxed" title={row.prompt}>
                          {row.prompt || "Catalog lookbook generation"}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-ink-faint pt-1 border-t border-line/50">
                          <span>{new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {row.output_url && (
                            <button
                              type="button"
                              onClick={() => downloadImage(row.output_url!, `florus-catalog-${i + 1}.png`)}
                              className="text-fuchsia-accent hover:underline font-semibold cursor-pointer"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progressive Batch Loading */}
                {filteredHistory.length > visibleHistoryCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleHistoryCount((prev) => prev + 24)}
                      className="btn-secondary px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-sm hover:border-fuchsia-accent/50"
                    >
                      Load More Lookbooks ({filteredHistory.length - visibleHistoryCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Fullscreen Zoom Lightbox Modal */}
            {lightboxRecord && lightboxRecord.output_url && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
                onClick={() => setLightboxRecord(null)}
              >
                <div
                  className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Lightbox Header */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line bg-surface/90">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="h-4 w-4 text-fuchsia-accent shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-ink truncate">
                        Lookbook Preview — {new Date(lightboxRecord.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(lightboxRecord.output_url!)}
                        className="btn-secondary px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedUrl === lightboxRecord.output_url ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-sage" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Copy Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadImage(lightboxRecord.output_url!, `florus-editorial-${Date.now()}.png`)}
                        disabled={downloadingUrl === lightboxRecord.output_url}
                        className="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {downloadingUrl === lightboxRecord.output_url ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span>Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLightboxRecord(null)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-sand cursor-pointer ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lightbox Image Viewport */}
                  <div className="flex-1 bg-black/60 flex items-center justify-center p-2 sm:p-4 overflow-hidden max-h-[70vh]">
                    <img
                      src={lightboxRecord.output_url}
                      alt={lightboxRecord.prompt || "Lookbook"}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                      decoding="async"
                    />
                  </div>

                  {/* Lightbox Footer Prompt */}
                  <div className="px-4 sm:px-6 py-3 border-t border-line bg-surface flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-accent">
                      Prompt / Recipe
                    </span>
                    <p className="text-xs text-ink-soft leading-relaxed max-h-16 overflow-y-auto">
                      {lightboxRecord.prompt || "Editorial Catalog Generation"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })()}

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
              <p className="text-xs text-ink-soft leading-relaxed">Flat 1 Credit rate per 5MP lookbook generated through the Florus AI engine.</p>
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
                      paymentsList.map((pay) => (
                        <tr key={pay.id || pay.upi_txn_id}>
                          <td>
                            <div className="flex flex-col min-w-0">
                              <span className="text-ink font-medium select-all truncate max-w-[140px] sm:max-w-none pr-2" title={pay.upi_txn_id}>{pay.upi_txn_id}</span>
                              <span className="text-[10px] text-ink-faint mt-0.5">{new Date(pay.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="text-ink font-semibold whitespace-nowrap">
                            {pay.status === "completed" ? (
                              <span className="text-sm font-bold text-fuchsia-accent">
                                +{creditsFromBalance(Number(pay.amount)).toFixed(1)} Credits
                              </span>
                            ) : (
                              <span className="text-xs text-ink-faint">
                                ₹{Number(pay.amount).toFixed(2)}
                              </span>
                            )}
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
            {/* Account Panel */}
            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                <Key className="h-4 w-4 text-purple-accent" /> Account
              </h4>
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="label-caps">Email</span>
                <span className="text-xs text-ink select-all">{profile?.email || "—"}</span>
              </div>
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="label-caps">Account ID</span>
                <span className="text-xs text-ink select-all break-all">{profile?.id || "—"}</span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed mt-1">
                Quote your Account ID when contacting support about wallet credits or payments.
              </p>
            </div>

            {/* Pricing & platform info */}
            <div className="bg-sand border border-muted-purple p-3.5 sm:p-4 rounded-xl flex flex-col gap-3 justify-between">
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-sage" /> Pricing
                </h4>
                <div className="flex flex-col gap-1 mt-1 text-xs text-ink-soft">
                  <div className="flex justify-between border-b border-muted-purple pb-1.5">
                    <span>Credit price</span>
                    <span className="text-ink font-semibold">₹{CREDIT_PRICE_INR}</span>
                  </div>
                  <div className="flex justify-between border-b border-muted-purple py-1.5">
                    <span>Per lookbook</span>
                    <span className="text-ink font-semibold">1 Credit</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span>Wallet</span>
                    <span className="text-ink font-semibold">
                      {walletBalance !== null ? `${creditsFromBalance(walletBalance).toFixed(1)} Credits` : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Top-ups are verified manually and credited to your wallet after approval.
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
