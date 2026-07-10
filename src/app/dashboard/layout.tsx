"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sparkles, 
  Layers, 
  History, 
  CreditCard, 
  Settings, 
  Wallet, 
  Plus, 
  LogOut,
  User,
  X,
  CheckCircle2,
  Lock,
  Copy,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  email: string | null;
  balance_inr: number;
}

function Sidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "generate";

  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  
  // UPI Form State
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || "placeholder@upi";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("email, balance_inr")
            .eq("id", session.user.id)
            .single();

          if (error) throw error;
          setProfile({
            email: data.email || session.user.email || null,
            balance_inr: Number(data.balance_inr),
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Set up auth state change listener to re-fetch profile if user logs in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    window.addEventListener("profile-updated", fetchProfile);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", fetchProfile);
    };
  }, []);

  // Handle Wallet Top Up Submission via RPC
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpLoading(true);
    setTopUpSuccess(false);
    setTopUpError(null);

    try {
      const amountToAdd = parseFloat(topUpAmount);
      if (isNaN(amountToAdd) || amountToAdd <= 0) {
        throw new Error("Invalid top up amount");
      }
      if (!upiTxnId.trim()) {
        throw new Error("UPI Transaction Ref ID / UTR is required");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Session expired, please sign in again");
      }

      // Log payment and credit balance atomically in database
      const { data: newBalance, error: rpcError } = await supabase.rpc(
        "submit_upi_payment",
        {
          p_amount: amountToAdd,
          p_upi_txn_id: upiTxnId.trim()
        }
      );

      if (rpcError) throw rpcError;

      setProfile(prev => prev ? { ...prev, balance_inr: Number(newBalance) } : null);
      setTopUpSuccess(true);
      setUpiTxnId("");
      
      // Dispatch update to let the GenerateWorkspace know about the new balance
      window.dispatchEvent(new Event("profile-updated"));

      setTimeout(() => {
        setShowTopUpModal(false);
        setTopUpSuccess(false);
      }, 4500);
    } catch (err) {
      console.error("Top up error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to submit transaction details.";
      setTopUpError(errMsg);
    } finally {
      setTopUpLoading(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Navigation Items
  const navItems = [
    { id: "generate", label: "Generate Image", icon: Layers },
    { id: "history", label: "Catalog History", icon: History },
    { id: "billing", label: "Billing & Payments", icon: CreditCard },
    { id: "settings", label: "Admin Settings", icon: Settings },
  ];

  return (
    <>
      <aside className="w-72 bg-surface border-r border-muted-purple/40 flex flex-col justify-between z-10 shrink-0 select-none">
        
        {/* Top: Branding Logo & Status */}
        <div className="flex flex-col gap-6 p-6 border-b border-muted-purple/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-fuchsia-accent to-purple-accent flex items-center justify-center shadow-lg shadow-fuchsia-accent/15">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-[0.2em] text-white">
              FLOARUS<span className="text-fuchsia-accent">.</span>PICS
            </span>
          </div>
          
          <div className="flex items-center gap-3 bg-void/50 border border-muted-purple/40 px-3 py-2 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-muted-purple to-surface border border-muted-purple flex items-center justify-center">
              <User className="h-4 w-4 text-foreground-muted" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-mono font-medium truncate text-white">
                {profile?.email || "Loading partner..."}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-bold text-fuchsia-accent">
                B2B Brand Tier
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Navigation Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <Link
                key={item.id}
                href={`/dashboard?tab=${item.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group border-l-2 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-fuchsia-accent/10 to-transparent border-fuchsia-accent text-white"
                    : "border-transparent text-foreground-muted hover:text-white hover:bg-void/30"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-colors ${
                  isActive ? "text-fuchsia-accent" : "text-foreground-muted group-hover:text-white"
                }`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Wallet Display Card & Action */}
        <div className="p-6 border-t border-muted-purple/30 flex flex-col gap-4">
          <div className="glassmorphic-card p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden border border-muted-purple/50">
            <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-purple-accent/10 to-transparent rounded-full blur-md" />
            <div className="flex items-center gap-2 text-xs font-mono text-foreground-muted">
              <Wallet className="h-4 w-4 text-purple-accent" />
              <span>Available Wallet</span>
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Balance (INR)</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {loading ? (
                  <span className="h-5 w-16 bg-zinc-800 rounded animate-pulse inline-block" />
                ) : (
                  `₹${profile?.balance_inr.toFixed(2)}`
                )}
              </span>
            </div>

            <button
              onClick={() => setShowTopUpModal(true)}
              className="w-full py-2 bg-gradient-to-r from-purple-accent/80 to-purple-accent text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 glow-btn-purple cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Top Up Balance</span>
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-muted-purple/50 text-xs font-medium text-foreground-muted hover:text-white hover:bg-red-950/20 hover:border-red-900/40 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* UPI Wallet Top Up Dialog Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glassmorphic-card rounded-2xl p-6 relative border border-muted-purple/60">
            <button
              onClick={() => {
                setShowTopUpModal(false);
                setTopUpError(null);
              }}
              className="absolute right-4 top-4 text-foreground-muted hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-purple-accent" />
              <h3 className="text-lg font-bold">Replenish via UPI</h3>
            </div>

            {topUpSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
                <h4 className="text-base font-bold text-white leading-snug">Transaction Submitted!</h4>
                <p className="text-xs text-foreground-muted font-mono leading-relaxed max-w-[280px]">
                  Transaction submitted successfully! Your payment is pending manual validation. Balance will be updated once approved by the administrator.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-4">
                <div className="bg-void/50 border border-muted-purple/60 rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Step 1: Scan / Transfer to UPI ID</span>
                  
                  <div className="flex items-center justify-between bg-surface border border-muted-purple/50 px-3 py-2 rounded-lg mt-1">
                    <span className="text-xs text-white font-mono select-all truncate">{upiId}</span>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="text-foreground-muted hover:text-white transition-colors p-1"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                    Complete the payment for the desired replenishment amount in your preferred UPI application.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted">Amount Transferred (INR)</label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full bg-void/50 border border-muted-purple/60 px-3 py-2 rounded-lg text-sm text-white font-mono focus:border-purple-accent focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted">UPI UTR / Transaction Ref ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12-digit transaction ID"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value)}
                    className="w-full bg-void/50 border border-muted-purple/60 px-3 py-2 rounded-lg text-sm text-white font-mono focus:border-purple-accent focus:outline-none"
                  />
                </div>

                {topUpError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                    {topUpError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t border-muted-purple/40 pt-4 mt-2">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Lock className="h-3 w-3 text-purple-accent" /> Payments credited to profiles atomically.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="w-full py-2.5 mt-2 rounded-lg bg-gradient-to-r from-purple-accent to-fuchsia-accent text-white font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 glow-btn-purple cursor-pointer"
                >
                  {topUpLoading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm UPI Transfer</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/");
        } else {
          setAuthorized(true);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.replace("/");
      }
    }
    checkAuth();

    // Subscribe to auth state changes to redirect on logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-void flex items-center justify-center text-foreground-muted font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <span className="h-5 w-5 border-2 border-fuchsia-accent/30 border-t-fuchsia-accent rounded-full animate-spin" />
          <span>Verifying authorization session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-void text-white font-sans relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full bg-purple-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] rounded-full bg-fuchsia-accent/5 blur-[120px] pointer-events-none" />

      {/* Sidebar - Wrapped in Suspense to resolve searchParams SSR/CSR bailout */}
      <Suspense fallback={<div className="w-72 bg-surface border-r border-muted-purple/40 animate-pulse" />}>
        <Sidebar />
      </Suspense>

      {/* Main Canvas Scrollable Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10 relative">
        <div className="flex-1 p-8 md:p-12">
          {children}
        </div>
      </main>

    </div>
  );
}
