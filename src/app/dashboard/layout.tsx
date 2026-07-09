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
  Lock
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
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Fetch Supabase user profile
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
      } else {
        // Mock fallback if user is not logged in
        setProfile({
          email: "guest.brand@maison.com",
          balance_inr: 450.00,
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      // Fallback
      setProfile({
        email: "guest.brand@maison.com",
        balance_inr: 450.00,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // Handle Wallet Top Up Simulation
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpLoading(true);
    setTopUpSuccess(false);

    try {
      const amountToAdd = parseFloat(topUpAmount);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Update balance in Supabase
        const currentBalance = profile?.balance_inr || 0;
        const newBalance = currentBalance + amountToAdd;

        const { error } = await supabase
          .from("profiles")
          .update({ balance_inr: newBalance })
          .eq("id", session.user.id);

        if (error) throw error;
        setProfile(prev => prev ? { ...prev, balance_inr: newBalance } : null);
      } else {
        // Update local state for guest
        setProfile(prev => prev ? { ...prev, balance_inr: prev.balance_inr + amountToAdd } : null);
      }

      setTopUpSuccess(true);
      setTimeout(() => {
        setShowTopUpModal(false);
        setTopUpSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Top up error:", err);
    } finally {
      setTopUpLoading(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
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

      {/* Top Up Wallet Dialog Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glassmorphic-card rounded-2xl p-6 relative border border-muted-purple/60">
            <button
              onClick={() => setShowTopUpModal(false)}
              className="absolute right-4 top-4 text-foreground-muted hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-purple-accent" />
              <h3 className="text-lg font-bold">Secure Wallet Top Up</h3>
            </div>

            {topUpSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
                <h4 className="text-xl font-bold text-white">Payment Successful</h4>
                <p className="text-xs text-foreground-muted font-mono">
                  Added ₹{parseFloat(topUpAmount).toFixed(2)} to your balance.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-4">
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Select a B2B replenishment package to top up your virtual currency. These credits are consumed per image synthesis.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "₹500", value: "500" },
                    { label: "₹1,000", value: "1000" },
                    { label: "₹5,000", value: "5000" }
                  ].map((pkg) => (
                    <button
                      key={pkg.value}
                      type="button"
                      onClick={() => setTopUpAmount(pkg.value)}
                      className={`py-2 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                        topUpAmount === pkg.value
                          ? "border-purple-accent bg-purple-accent/20 text-white"
                          : "border-muted-purple bg-void/50 text-foreground-muted hover:text-white"
                      }`}
                    >
                      {pkg.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted">Custom Amount (INR)</label>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full bg-void/50 border border-muted-purple/60 px-3 py-2 rounded-lg text-sm text-white font-mono focus:border-purple-accent focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 border-t border-muted-purple/40 pt-4 mt-2">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Lock className="h-3 w-3 text-purple-accent" /> Simulated Sandbox Payment Gateway
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
                    <span>Authorize Transaction</span>
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
