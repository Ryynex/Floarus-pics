"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
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
  Check,
  Menu
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  email: string | null;
  balance_inr: number;
}

function Sidebar({ isMobile, onClose }: { isMobile?: boolean; onClose?: () => void }) {
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
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <aside className={`${isMobile ? "w-full" : "w-72"} bg-surface border-r border-muted-purple flex flex-col justify-between z-10 shrink-0 select-none h-full`}>

        {/* Top: Branding Logo & Status */}
        <div className="flex flex-col gap-6 p-6 border-b border-muted-purple">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/images/florus_logo.png" alt="Florus Logo" className="h-9 w-9 object-contain" />
              <span className="text-base font-bold tracking-[0.16em] text-ink">
                FLORUS<span className="text-fuchsia-accent">.</span>PICS
              </span>
            </div>
            {isMobile && (
              <button
                onClick={onClose}
                className="p-1 text-ink-faint hover:text-ink cursor-pointer"
                title="Close Drawer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 bg-sand border border-muted-purple px-3 py-2.5 rounded-xl">
            <div className="h-9 w-9 rounded-full bg-clay-soft border border-line flex items-center justify-center">
              <User className="h-4 w-4 text-fuchsia-accent" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium truncate text-ink">
                {profile?.email || "Loading account..."}
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-fuchsia-accent">
                B2B Brand Account
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Navigation Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <Link
                key={item.id}
                href={`/dashboard?tab=${item.id}`}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group border-l-[3px] cursor-pointer ${
                  isActive
                    ? "bg-clay-soft border-fuchsia-accent text-ink"
                    : "border-transparent text-ink-soft hover:text-ink hover:bg-sand/70"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] transition-colors ${
                  isActive ? "text-fuchsia-accent" : "text-ink-faint group-hover:text-ink-soft"
                }`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Wallet Display Card & Action */}
        <div className="p-4 sm:p-6 border-t border-muted-purple flex flex-col gap-3 sm:gap-4">
          <div className="card p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-soft">
              <Wallet className="h-4 w-4 text-purple-accent" />
              <span>Wallet Balance</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="label-caps">Balance (INR)</span>
              <span className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                {loading ? (
                  <span className="h-5 w-16 bg-sand rounded animate-pulse inline-block" />
                ) : (
                  `₹${profile?.balance_inr.toFixed(2)}`
                )}
              </span>
            </div>

            <button
              onClick={() => setShowTopUpModal(true)}
              className="btn-primary w-full py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Top Up Balance</span>
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="btn-secondary flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-brick hover:bg-brick-soft hover:border-brick/30 hover:text-brick cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* UPI Wallet Top Up Dialog Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="card w-full max-w-md p-4 sm:p-6 relative">
            <button
              onClick={() => {
                setShowTopUpModal(false);
                setTopUpError(null);
              }}
              className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 text-ink-faint hover:text-ink transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-purple-accent" />
              <h3 className="text-lg font-bold text-ink">Top Up via UPI</h3>
            </div>

            {topUpSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle2 className="h-16 w-16 text-sage" />
                <h4 className="text-base font-bold text-ink leading-snug">Transaction Submitted</h4>
                <p className="text-sm text-ink-soft leading-relaxed max-w-[280px]">
                  Your payment is pending manual validation. Balance will update once approved by an administrator.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-4">
                <div className="bg-sand border border-muted-purple rounded-xl p-4 flex flex-col gap-2">
                  <span className="label-caps">Step 1 · Transfer to UPI ID</span>

                  <div className="flex items-center justify-between bg-surface border border-muted-purple px-3 py-2 rounded-lg mt-1">
                    <span className="text-sm text-ink font-medium select-all truncate">{upiId}</span>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="text-ink-faint hover:text-ink transition-colors p-1"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-ink-faint mt-1 leading-normal">
                    Complete the payment in your preferred UPI app for the desired amount.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label-caps">Amount Transferred (INR)</label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label-caps">UPI UTR / Transaction Ref ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12-digit transaction ID"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value)}
                    className="input-field"
                  />
                </div>

                {topUpError && (
                  <div className="p-3 bg-brick-soft border border-brick/25 rounded-lg text-sm text-brick">
                    {topUpError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t border-line pt-4 mt-1">
                  <span className="text-xs text-ink-faint flex items-center gap-1">
                    <Lock className="h-3 w-3 text-purple-accent" /> Payments are credited to your wallet after admin approval.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="btn-primary w-full py-2.5 mt-1 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  {topUpLoading ? (
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileBalance, setProfileBalance] = useState<number | null>(null);

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

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("balance_inr")
            .eq("id", session.user.id)
            .single();
          if (data) setProfileBalance(Number(data.balance_inr));
        }
      } catch (err) {
        console.error("Error loading header balance:", err);
      }
    }
    if (authorized) {
      fetchBalance();
    }

    window.addEventListener("profile-updated", fetchBalance);
    return () => {
      window.removeEventListener("profile-updated", fetchBalance);
    };
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-void flex items-center justify-center text-ink-soft text-sm">
        <div className="flex flex-col items-center gap-3">
          <span className="h-5 w-5 border-2 border-fuchsia-accent/30 border-t-fuchsia-accent rounded-full animate-spin" />
          <span>Verifying your session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-void text-ink font-sans relative overflow-hidden">

      {/* Sidebar Desktop View (Hidden on mobile/tablet) */}
      <div className="hidden lg:flex w-72 shrink-0 border-r border-muted-purple bg-surface">
        <Suspense fallback={<div className="w-72 bg-surface border-r border-muted-purple animate-pulse" />}>
          <Sidebar />
        </Suspense>
      </div>

      {/* Mobile Drawer Menu Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-surface flex flex-col justify-between select-none animate-slide-in shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<div className="w-full h-full bg-surface animate-pulse" />}>
              <Sidebar isMobile onClose={() => setIsMobileMenuOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Main Canvas Scrollable Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10 relative">
        {/* Desktop Top-Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-surface border-b border-muted-purple sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-[0.1em] text-ink">
              FLORUS <span className="text-fuchsia-accent">AI STUDIO</span>
            </span>
            <span className="pill-neutral text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full">
              B2B
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet Balance */}
            <div className="flex items-center gap-2 bg-sand border border-muted-purple px-3 py-1.5 rounded-lg text-sm">
              <Wallet className="h-3.5 w-3.5 text-purple-accent" />
              <span className="text-ink font-semibold">₹{profileBalance !== null ? profileBalance.toFixed(2) : "0.00"}</span>
            </div>

            {/* My Catalog */}
            <Link
              href="/dashboard?tab=history"
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <History className="h-3.5 w-3.5 text-fuchsia-accent" />
              <span>My Catalog</span>
            </Link>

            {/* Logout */}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-ink-soft"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Mobile top-bar navigation header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 bg-surface border-b border-muted-purple sticky top-0 z-30">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="btn-secondary p-1.5 sm:p-2 rounded-lg cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold tracking-[0.16em] text-ink">
              FLORUS<span className="text-fuchsia-accent">.</span>PICS
            </span>
          </div>

          <div className="flex items-center gap-2 bg-sand border border-muted-purple px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm">
            <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-accent" />
            <span className="text-ink font-semibold">₹{profileBalance !== null ? profileBalance.toFixed(2) : "0.00"}</span>
          </div>
        </header>

        <div className="flex-1 p-3 sm:p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

    </div>
  );
}
