"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  AlertTriangle, 
  ArrowLeft, 
  CreditCard, 
  Image as ImageIcon, 
  Users, 
  DollarSign, 
  Check 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  email: string | null;
  balance_inr: number;
  updated_at: string;
}

interface GenerationRecord {
  id: string;
  user_id: string;
  prompt: string;
  garment_url: string;
  face_url: string | null;
  output_url: string | null;
  status: string;
  cost_inr: number;
  created_at: string;
  email?: string | null;
}

interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  upi_txn_id: string;
  status: string;
  created_at: string;
  email?: string | null;
}

export default function AdminPage() {
  const router = useRouter();

  // Auth & Guard State
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Data State
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [generationsList, setGenerationsList] = useState<GenerationRecord[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // UI State
  const [currentTab, setCurrentTab] = useState<"overview" | "users" | "generations" | "payments">("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [editBalanceUser, setEditBalanceUser] = useState<Profile | null>(null);
  const [newBalanceValue, setNewBalanceValue] = useState<string>("");
  const [editGen, setEditGen] = useState<GenerationRecord | null>(null);
  const [editGenStatus, setEditGenStatus] = useState<string>("");
  const [editGenCost, setEditGenCost] = useState<string>("");
  const [editGenOutputUrl, setEditGenOutputUrl] = useState<string>("");

  const [editPayment, setEditPayment] = useState<PaymentRecord | null>(null);
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>("");

  const [createPaymentUser, setCreatePaymentUser] = useState<Profile | null>(null);
  const [createPaymentAmount, setCreatePaymentAmount] = useState<string>("");
  const [createPaymentTxnId, setCreatePaymentTxnId] = useState<string>("");
  const [createPaymentStatus, setCreatePaymentStatus] = useState<string>("completed");

  const [deleteTarget, setDeleteTarget] = useState<{ type: "user" | "generation" | "payment"; id: string } | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Authenticate Admin User
  useEffect(() => {
    async function verifyAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email;
          if (email === "admin@floarus.pics") {
            setIsAdmin(true);
            setAdminEmail(email);
            // Fetch dashboard data
            fetchDashboardData();
          } else {
            setIsAdmin(false);
            setAuthError("Unauthorized user. Redirecting...");
            setTimeout(() => {
              router.replace("/dashboard");
            }, 2500);
          }
        } else {
          setIsAdmin(false);
          setAuthError("Not logged in. Redirecting to home...");
          setTimeout(() => {
            router.replace("/");
          }, 2500);
        }
      } catch (err) {
        console.error("Auth guard check exception:", err);
        setIsAdmin(false);
        setAuthError("Auth error occurred. Redirecting...");
        setTimeout(() => {
          router.replace("/");
        }, 2500);
      }
    }
    verifyAdmin();
  }, [router]);

  // Fetch all tables
  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      
      // Profiles
      const { data: profiles, error: errProf } = await supabase
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (errProf) throw errProf;

      // Generations
      const { data: gens, error: errGen } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false });
      if (errGen) throw errGen;

      // Payments
      const { data: pays, error: errPay } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (errPay) throw errPay;

      // Map emails in memory
      const emailMap: { [key: string]: string | null } = {};
      profiles?.forEach(p => {
        emailMap[p.id] = p.email;
      });

      const processedGens = (gens || []).map(g => ({
        ...g,
        email: emailMap[g.user_id] || "Unknown User"
      }));

      const processedPays = (pays || []).map(p => ({
        ...p,
        email: emailMap[p.user_id] || "Unknown User"
      }));

      setUsersList(profiles || []);
      setGenerationsList(processedGens);
      setPaymentsList(processedPays);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showFeedback("error", "Failed to reload dashboard data.");
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Utility to trigger quick floating messages
  const showFeedback = (type: "success" | "error", text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  // -------------------------------------------------------------
  // Data modification handlers
  // -------------------------------------------------------------

  // Edit user balance manually
  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBalanceUser || !newBalanceValue) return;

    setSubmittingAction(true);
    const targetUserId = editBalanceUser.id;
    const oldBalance = editBalanceUser.balance_inr;
    const newBalance = parseFloat(newBalanceValue);

    if (isNaN(newBalance) || newBalance < 0) {
      showFeedback("error", "Please enter a valid non-negative balance.");
      setSubmittingAction(false);
      return;
    }

    try {
      // 1. Update Profile Balance
      const { error: profError } = await supabase
        .from("profiles")
        .update({ balance_inr: newBalance, updated_at: new Date().toISOString() })
        .eq("id", targetUserId);

      if (profError) throw profError;

      // 2. Log corresponding payment ledger item (only if balance changes)
      const diff = newBalance - oldBalance;
      if (diff !== 0) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").substring(0, 14);
        const txnId = `MANUAL_${diff > 0 ? "CREDIT" : "DEBIT"}_${timestamp}`;
        const absDiff = Math.abs(diff);

        // Keep ledger entries strictly compliant with payments constraints if possible
        // Note: constraint checks payments_amount_check (amount > 0.00). If diff < 0, we can still log absolute amount
        const { error: payError } = await supabase
          .from("payments")
          .insert({
            user_id: targetUserId,
            amount: absDiff,
            upi_txn_id: txnId,
            status: "completed"
          });

        if (payError) {
          console.warn("Ledger tracking record failed, but balance updated:", payError.message);
        }
      }

      showFeedback("success", `Successfully updated balance for ${editBalanceUser.email} to ₹${newBalance.toFixed(2)}.`);
      setEditBalanceUser(null);
      setNewBalanceValue("");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Error occurred while adjusting wallet balance.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Edit generation status, cost, output_url
  const handleUpdateGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGen) return;

    setSubmittingAction(true);
    const parsedCost = parseFloat(editGenCost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      showFeedback("error", "Cost must be a valid non-negative number.");
      setSubmittingAction(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("generations")
        .update({
          status: editGenStatus,
          cost_inr: parsedCost,
          output_url: editGenOutputUrl || null
        })
        .eq("id", editGen.id);

      if (error) throw error;

      showFeedback("success", "Successfully updated generation record.");
      setEditGen(null);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Error occurred while updating generation details.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Edit payment status (e.g. processing or completing a pending payment)
  const handleUpdatePaymentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment) return;

    setSubmittingAction(true);
    const previousStatus = editPayment.status;
    const targetStatus = editPaymentStatus;

    try {
      // 1. Update Payment record
      const { error: payErr } = await supabase
        .from("payments")
        .update({ status: targetStatus })
        .eq("id", editPayment.id);

      if (payErr) throw payErr;

      // 2. If payment was 'pending' and is now marked 'completed', automatically top up user balance
      if (previousStatus === "pending" && targetStatus === "completed") {
        // Fetch current user profile to avoid dirty states
        const { data: prof, error: getErr } = await supabase
          .from("profiles")
          .select("balance_inr")
          .eq("id", editPayment.user_id)
          .single();

        if (getErr) throw getErr;

        const currentBal = Number(prof?.balance_inr || 0);
        const { error: profErr } = await supabase
          .from("profiles")
          .update({ 
            balance_inr: currentBal + Number(editPayment.amount), 
            updated_at: new Date().toISOString() 
          })
          .eq("id", editPayment.user_id);

        if (profErr) throw profErr;
        showFeedback("success", `Marked transaction completed. Credited +₹${Number(editPayment.amount).toFixed(2)} to user's wallet.`);
      } else {
        showFeedback("success", `Updated payment transaction to ${targetStatus.toUpperCase()}.`);
      }

      setEditPayment(null);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to update payment status.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Approve payment directly (marks completed, credits balance)
  const handleApprovePayment = async (pay: PaymentRecord) => {
    if (pay.status !== "pending") return;
    if (!confirm(`Are you sure you want to APPROVE payment ref ${pay.upi_txn_id} and credit ₹${Number(pay.amount).toFixed(2)}?`)) return;

    setSubmittingAction(true);
    try {
      // 1. Update status to completed
      const { error: payErr } = await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("id", pay.id);

      if (payErr) throw payErr;

      // 2. Fetch current balance
      const { data: prof, error: getErr } = await supabase
        .from("profiles")
        .select("balance_inr")
        .eq("id", pay.user_id)
        .single();

      if (getErr) throw getErr;

      const currentBal = Number(prof?.balance_inr || 0);

      // 3. Update profiles balance
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ 
          balance_inr: currentBal + Number(pay.amount), 
          updated_at: new Date().toISOString() 
        })
        .eq("id", pay.user_id);

      if (profErr) throw profErr;

      showFeedback("success", `Approved transaction ${pay.upi_txn_id}. Credited +₹${Number(pay.amount).toFixed(2)} to user's wallet.`);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to approve payment.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reject payment directly (marks failed, no wallet credit)
  const handleRejectPayment = async (pay: PaymentRecord) => {
    if (pay.status !== "pending") return;
    if (!confirm(`Are you sure you want to REJECT payment ref ${pay.upi_txn_id}?`)) return;

    setSubmittingAction(true);
    try {
      const { error: payErr } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", pay.id);

      if (payErr) throw payErr;

      showFeedback("success", `Rejected transaction ${pay.upi_txn_id}.`);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to reject payment.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Create manual payment log
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPaymentUser || !createPaymentAmount || !createPaymentTxnId) return;

    setSubmittingAction(true);
    const amount = parseFloat(createPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showFeedback("error", "Amount must be a positive number.");
      setSubmittingAction(false);
      return;
    }

    try {
      // 1. Insert Payment entry
      const { error: insertErr } = await supabase
        .from("payments")
        .insert({
          user_id: createPaymentUser.id,
          amount: amount,
          upi_txn_id: createPaymentTxnId,
          status: createPaymentStatus
        });

      if (insertErr) throw insertErr;

      // 2. If logged directly as completed, adjust profile balance automatically
      if (createPaymentStatus === "completed") {
        const currentBal = Number(createPaymentUser.balance_inr || 0);
        const { error: profErr } = await supabase
          .from("profiles")
          .update({
            balance_inr: currentBal + amount,
            updated_at: new Date().toISOString()
          })
          .eq("id", createPaymentUser.id);

        if (profErr) throw profErr;
        showFeedback("success", `Log entry added. Automatically added +₹${amount.toFixed(2)} to ${createPaymentUser.email}.`);
      } else {
        showFeedback("success", "Pending transaction log recorded successfully.");
      }

      setCreatePaymentUser(null);
      setCreatePaymentAmount("");
      setCreatePaymentTxnId("");
      setCreatePaymentStatus("completed");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", err instanceof Error && err.message.includes("unique") 
        ? "Transaction ID already exists." 
        : "Failed to create manual payment log.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle deletions
  const handleDeleteRecord = async () => {
    if (!deleteTarget) return;

    setSubmittingAction(true);
    const { type, id } = deleteTarget;

    try {
      let error = null;
      if (type === "user") {
        const { error: err } = await supabase.from("profiles").delete().eq("id", id);
        error = err;
      } else if (type === "generation") {
        const { error: err } = await supabase.from("generations").delete().eq("id", id);
        error = err;
      } else if (type === "payment") {
        const { error: err } = await supabase.from("payments").delete().eq("id", id);
        error = err;
      }

      if (error) throw error;

      showFeedback("success", `Successfully deleted ${type} record.`);
      setDeleteTarget(null);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      showFeedback("error", `Failed to delete the selected ${type}.`);
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // Data computations for dashboard
  // -------------------------------------------------------------

  // Calculations for overview stats cards
  const totalUsers = usersList.length;
  const totalBalance = usersList.reduce((acc, curr) => acc + Number(curr.balance_inr), 0);
  const totalGens = generationsList.length;
  const totalRevenue = paymentsList
    .filter(p => p.status === "completed")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Search logic filter
  const filteredUsers = usersList.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGens = generationsList.filter(g => 
    g.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPays = paymentsList.filter(p => 
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.upi_txn_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Return Loading Screen while verifying Admin credentials
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-void w-full flex flex-col justify-center items-center gap-4 text-center px-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-fuchsia-accent to-purple-accent flex items-center justify-center shadow-lg shadow-fuchsia-accent/25 animate-pulse">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-[0.25em] text-white">FLOARUS.PICS</h2>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse mt-1">Securing God Mode Portal...</p>
        </div>
      </div>
    );
  }

  // Return Error Screen if unauthorized
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-void w-full flex flex-col justify-center items-center gap-4 text-center px-4">
        <div className="h-12 w-12 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-xs text-foreground-muted leading-relaxed font-mono">
            {authError || "This subdomain requires administrative credentials."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-void flex flex-col overflow-x-hidden text-sm">
      
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-accent/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-purple-accent/5 blur-[150px] pointer-events-none" />

      {/* Admin Floating Banner Feedback */}
      {actionFeedback && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border flex items-center gap-3 shadow-2xl backdrop-blur-md max-w-md animate-bounce ${
          actionFeedback.type === "success" 
            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" 
            : "bg-red-950/80 border-red-500/40 text-red-300"
        }`}>
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <span className="font-mono text-xs">{actionFeedback.text}</span>
        </div>
      )}

      {/* Main Admin layout */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 flex flex-col gap-6 z-10">
        
        {/* Header bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface/50 border border-muted-purple/40 p-4 md:p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest text-fuchsia-accent font-semibold border border-fuchsia-accent/30 bg-fuchsia-accent/10 px-2 py-0.5 rounded">
                SYSTEM CONTROL
              </span>
              <span className="text-xs font-mono text-zinc-500">v2.4 - God Mode</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              FLOARUS.PICS <span className="text-zinc-500">//</span> <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-accent to-purple-accent">ADMIN DASHBOARD</span>
            </h1>
            <p className="text-xs text-foreground-muted font-mono">
              Root Authentication: <span className="text-emerald-400 font-semibold">{adminEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-muted-purple bg-void/50 text-xs font-semibold hover:border-purple-accent/50 text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Sync Database</span>
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut();
                router.replace("/");
              }}
              className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-950/20 text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:border-red-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Exit Portal</span>
            </button>
          </div>
        </header>

        {/* Tab Selection Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-void/80 border border-muted-purple/40 p-1.5 rounded-2xl">
          {(["overview", "users", "generations", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setCurrentTab(tab); setSearchQuery(""); }}
              className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider ${
                currentTab === tab
                  ? "bg-surface text-white border border-muted-purple/60 shadow-lg shadow-black/40"
                  : "text-foreground-muted hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </section>

        {/* Dynamic Context Tabs */}
        {loadingData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 bg-surface/30 border border-muted-purple/30 rounded-2xl">
            <RefreshCw className="h-8 w-8 text-fuchsia-accent animate-spin" />
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Querying live data records...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">
            
            {/* SEARCH BANNER IF NOT OVERVIEW */}
            {currentTab !== "overview" && (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder={`Search ${currentTab} by user email, database IDs, transactions, prompts...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-muted-purple px-11 py-3.5 rounded-2xl text-xs text-white placeholder:text-zinc-600 glow-input"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* OVERVIEW TAB */}
            {currentTab === "overview" && (
              <div className="flex flex-col gap-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface/50 border border-muted-purple/50 p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-purple-accent/10 border border-purple-accent/30 flex items-center justify-center text-purple-accent">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Profiles Registered</span>
                    <span className="text-3xl font-extrabold text-white">{totalUsers}</span>
                  </div>

                  <div className="bg-surface/50 border border-muted-purple/50 p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-fuchsia-accent/10 border border-fuchsia-accent/30 flex items-center justify-center text-fuchsia-accent">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Users Balance Ledger</span>
                    <span className="text-3xl font-extrabold text-white">₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="bg-surface/50 border border-muted-purple/50 p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Image Generations</span>
                    <span className="text-3xl font-extrabold text-white">{totalGens}</span>
                  </div>

                  <div className="bg-surface/50 border border-muted-purple/50 p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Transactions Income</span>
                    <span className="text-3xl font-extrabold text-emerald-400">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Dashboard logs grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Recent Activity Feed */}
                  <div className="lg:col-span-8 bg-surface/50 border border-muted-purple/40 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="border-b border-muted-purple/30 pb-3 flex justify-between items-center">
                      <h3 className="font-bold text-white uppercase tracking-wider text-xs">Recent Platform Generations</h3>
                      <button onClick={() => setCurrentTab("generations")} className="text-[10px] text-fuchsia-accent font-semibold hover:underline">View All</button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {generationsList.slice(0, 4).length === 0 ? (
                        <span className="text-zinc-600 font-mono text-xs text-center py-6">No recent generations.</span>
                      ) : (
                        generationsList.slice(0, 4).map((g) => (
                          <div key={g.id} className="bg-void/40 border border-muted-purple/30 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-zinc-500 font-mono text-[9px] select-all truncate">{g.email}</span>
                              <span className="text-white font-medium truncate max-w-sm">{g.prompt}</span>
                              <span className="text-zinc-500 text-[10px] font-mono">{new Date(g.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                                g.status === "completed" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : g.status === "pending" || g.status === "processing"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {g.status}
                              </span>
                              <span className="text-white font-mono font-bold text-right">₹{Number(g.cost_inr).toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Key Alerts / Database Diagnostics */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    <div className="bg-surface/50 border border-muted-purple/40 p-5 rounded-2xl flex flex-col gap-4">
                      <div className="border-b border-muted-purple/30 pb-3">
                        <h3 className="font-bold text-white uppercase tracking-wider text-xs">System Diagnostics</h3>
                      </div>
                      <div className="flex flex-col gap-3 font-mono text-[10px] text-zinc-500">
                        <div className="flex justify-between items-center border-b border-muted-purple/20 pb-2">
                          <span>RLS Policy Bypass</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1"><Database className="h-3 w-3" /> ACTIVE</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-muted-purple/20 pb-2">
                          <span>Profiles Table</span>
                          <span className="text-white">{usersList.length} rows</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-muted-purple/20 pb-2">
                          <span>Generations Table</span>
                          <span className="text-white">{generationsList.length} rows</span>
                        </div>
                        <div className="flex justify-between items-center pb-1">
                          <span>Payments Table</span>
                          <span className="text-white">{paymentsList.length} rows</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface/50 border border-muted-purple/40 p-5 rounded-2xl flex flex-col gap-3.5">
                      <h4 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-purple-accent" /> Control Warnings
                      </h4>
                      <p className="text-[11px] text-foreground-muted leading-relaxed font-mono">
                        You have root privileges. Editing balances, payments, or deleting tables modifies live user experiences instantly. Actions are permanent.
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* USERS TAB */}
            {currentTab === "users" && (
              <div className="bg-surface/50 border border-muted-purple/40 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 font-mono text-xs">No registered user profiles found matching filters.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-muted-purple/40 text-zinc-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">User Email / Reference Key</th>
                          <th className="py-3 px-4 text-right">Wallet Balance</th>
                          <th className="py-3 px-4">Last Balance sync</th>
                          <th className="py-3 px-4 text-right">System Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted-purple/20 text-foreground-muted">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-void/20 transition-colors">
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-white font-bold select-all">{u.email}</span>
                                <span className="text-[9px] text-zinc-600 mt-1 select-all">{u.id}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <span className="text-white font-extrabold text-sm">₹{Number(u.balance_inr).toFixed(2)}</span>
                            </td>
                            <td className="py-4 px-4 text-zinc-500 whitespace-nowrap">
                              {u.updated_at ? new Date(u.updated_at).toLocaleString() : "Never"}
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditBalanceUser(u);
                                    setNewBalanceValue(u.balance_inr.toString());
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-purple-accent/30 bg-purple-accent/15 text-[10px] text-purple-300 font-bold hover:bg-purple-accent/25 hover:border-purple-accent/50 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Edit2 className="h-3 w-3" /> Adjust Balance
                                </button>
                                <button
                                  onClick={() => {
                                    setCreatePaymentUser(u);
                                    setCreatePaymentAmount("");
                                    setCreatePaymentTxnId("");
                                    setCreatePaymentStatus("completed");
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-300 font-bold hover:bg-emerald-500/25 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Log UPI
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({ type: "user", id: u.id })}
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-950/30 hover:border-red-500/40 transition-all cursor-pointer"
                                  title="Delete Profile"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* GENERATIONS TAB */}
            {currentTab === "generations" && (
              <div className="bg-surface/50 border border-muted-purple/40 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                  {filteredGens.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 font-mono text-xs">No generation logs found matching search.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-muted-purple/40 text-zinc-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">User Email / Date</th>
                          <th className="py-3 px-4">Model Run Prompt</th>
                          <th className="py-3 px-4">Inputs & Output URL previews</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Cost (INR)</th>
                          <th className="py-3 px-4 text-right">Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted-purple/20 text-foreground-muted">
                        {filteredGens.map((g) => (
                          <tr key={g.id} className="hover:bg-void/20 transition-colors">
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-white font-bold select-all">{g.email}</span>
                                <span className="text-[9px] text-zinc-500 mt-1 select-all">{new Date(g.created_at).toLocaleString()}</span>
                                <span className="text-[9px] text-zinc-600 mt-0.5 select-all">{g.id}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 max-w-xs truncate" title={g.prompt}>
                              <span className="text-white font-medium">{g.prompt}</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1.5 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-500 w-14">Garment:</span>
                                  <a href={g.garment_url} target="_blank" rel="noreferrer" className="text-fuchsia-accent hover:underline truncate max-w-[200px]" title={g.garment_url}>
                                    {g.garment_url.split("/").pop()}
                                  </a>
                                </div>
                                {g.face_url && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-500 w-14">Face:</span>
                                    <a href={g.face_url} target="_blank" rel="noreferrer" className="text-purple-accent hover:underline truncate max-w-[200px]" title={g.face_url}>
                                      {g.face_url.split("/").pop()}
                                    </a>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-500 w-14">Output:</span>
                                  {g.output_url ? (
                                    <a href={g.output_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline truncate max-w-[200px]" title={g.output_url}>
                                      {g.output_url.split("/").pop()}
                                    </a>
                                  ) : (
                                    <span className="text-zinc-600">Pending upload</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                                g.status === "completed" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : g.status === "pending" || g.status === "processing"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {g.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-white whitespace-nowrap">
                              ₹{Number(g.cost_inr).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditGen(g);
                                    setEditGenStatus(g.status);
                                    setEditGenCost(g.cost_inr.toString());
                                    setEditGenOutputUrl(g.output_url || "");
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-purple-accent/30 bg-purple-accent/15 text-[10px] text-purple-300 font-bold hover:bg-purple-accent/25 hover:border-purple-accent/50 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Edit2 className="h-3 w-3" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({ type: "generation", id: g.id })}
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-950/30 hover:border-red-500/40 transition-all cursor-pointer"
                                  title="Delete Generation Log"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {currentTab === "payments" && (
              <div className="bg-surface/50 border border-muted-purple/40 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                  {filteredPays.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 font-mono text-xs">No transaction records found matching search.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-muted-purple/40 text-zinc-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">User Email / Reference Key</th>
                          <th className="py-3 px-4">UPI Transaction ID</th>
                          <th className="py-3 px-4 text-right">Replenish Amount</th>
                          <th className="py-3 px-4">Receipt Date</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Control Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted-purple/20 text-foreground-muted">
                        {filteredPays.map((p) => (
                          <tr key={p.id} className="hover:bg-void/20 transition-colors">
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-white font-bold select-all">{p.email}</span>
                                <span className="text-[9px] text-zinc-600 mt-1 select-all">{p.user_id}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-white font-bold tracking-wider select-all">{p.upi_txn_id}</span>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <span className="text-emerald-400 font-extrabold text-sm">+₹{Number(p.amount).toFixed(2)}</span>
                            </td>
                            <td className="py-4 px-4 text-zinc-500 whitespace-nowrap">
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                                p.status === "completed" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : p.status === "pending"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {p.status === "pending" ? (
                                  <>
                                    <button
                                      onClick={() => handleApprovePayment(p)}
                                      disabled={submittingAction}
                                      className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300 font-bold hover:bg-emerald-500/25 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                      title="Approve & Credit Balance"
                                    >
                                      <Check className="h-3 w-3" /> Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectPayment(p)}
                                      disabled={submittingAction}
                                      className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] text-red-300 font-bold hover:bg-red-500/25 hover:border-red-500/50 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                      title="Reject Payment"
                                    >
                                      <X className="h-3 w-3" /> Reject
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditPayment(p);
                                      setEditPaymentStatus(p.status);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-purple-accent/30 bg-purple-accent/15 text-[10px] text-purple-300 font-bold hover:bg-purple-accent/25 hover:border-purple-accent/50 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit2 className="h-3 w-3" /> View Status
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteTarget({ type: "payment", id: p.id })}
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-950/30 hover:border-red-500/40 transition-all cursor-pointer"
                                  title="Delete Payment Log"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="w-full border-t border-muted-purple/40 bg-surface/20 py-6 text-center text-xs font-mono text-zinc-600 mt-12 z-10">
        <span>© {new Date().getFullYear()} Floarus.pics Inc. Admin panel access audited. IP logged and monitored.</span>
      </footer>

      {/* =============================================================
          MODAL INTERFACES
          ============================================================= */}

      {/* MODAL: EDIT BALANCE */}
      {editBalanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface border border-muted-purple/60 rounded-2xl p-6 relative flex flex-col gap-5 shadow-2xl">
            <button 
              onClick={() => setEditBalanceUser(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Adjust Wallet Credit</h3>
              <p className="text-[11px] text-foreground-muted font-mono truncate">{editBalanceUser.email}</p>
            </div>

            <form onSubmit={handleUpdateBalance} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Current Balance</label>
                <div className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs font-bold text-white font-mono">
                  ₹{Number(editBalanceUser.balance_inr).toFixed(2)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">New Credit Balance (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500.00"
                  value={newBalanceValue}
                  onChange={(e) => setNewBalanceValue(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                />
              </div>

              <div className="flex items-start gap-2 bg-purple-accent/5 border border-purple-accent/25 p-3 rounded-lg text-[10px] leading-relaxed text-purple-300 font-mono">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Saving will adjust the wallet and automatically log a matching completed transaction in the payments tab.</span>
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-bold text-xs transition-all flex items-center justify-center gap-2 glow-btn-fuchsia disabled:opacity-50 cursor-pointer"
              >
                {submittingAction ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Commit Adjustments</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MANUAL PAYMENT */}
      {createPaymentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface border border-muted-purple/60 rounded-2xl p-6 relative flex flex-col gap-5 shadow-2xl">
            <button 
              onClick={() => setCreatePaymentUser(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Log Manual UPI Payment</h3>
              <p className="text-[11px] text-foreground-muted font-mono truncate">{createPaymentUser.email}</p>
            </div>

            <form onSubmit={handleCreatePayment} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Replenish Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1000.00"
                  value={createPaymentAmount}
                  onChange={(e) => setCreatePaymentAmount(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">UPI Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI8273618491"
                  value={createPaymentTxnId}
                  onChange={(e) => setCreatePaymentTxnId(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Status</label>
                <select
                  value={createPaymentStatus}
                  onChange={(e) => setCreatePaymentStatus(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                >
                  <option value="completed" className="bg-surface">Completed (Instantly credits balance)</option>
                  <option value="pending" className="bg-surface">Pending (Must be approved later)</option>
                  <option value="failed" className="bg-surface">Failed (Declined/audit purposes)</option>
                </select>
              </div>

              <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/25 p-3 rounded-lg text-[10px] leading-relaxed text-emerald-400 font-mono">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Marking status as 'Completed' will instantly increase the user's current wallet balance by the transaction amount.</span>
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-bold text-xs transition-all flex items-center justify-center gap-2 glow-btn-fuchsia disabled:opacity-50 cursor-pointer"
              >
                {submittingAction ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Log UPI transaction</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT GENERATION */}
      {editGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface border border-muted-purple/60 rounded-2xl p-6 relative flex flex-col gap-5 shadow-2xl">
            <button 
              onClick={() => setEditGen(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Update Model Generation</h3>
              <p className="text-[11px] text-foreground-muted font-mono truncate">{editGen.email}</p>
            </div>

            <form onSubmit={handleUpdateGeneration} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Status</label>
                <select
                  value={editGenStatus}
                  onChange={(e) => setEditGenStatus(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                >
                  <option value="pending" className="bg-surface">Pending</option>
                  <option value="processing" className="bg-surface">Processing</option>
                  <option value="completed" className="bg-surface">Completed</option>
                  <option value="failed" className="bg-surface">Failed</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Cost (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 50.00"
                  value={editGenCost}
                  onChange={(e) => setEditGenCost(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Generated Output Image URL</label>
                <input
                  type="text"
                  placeholder="Paste cloudinary/bucket image URL"
                  value={editGenOutputUrl}
                  onChange={(e) => setEditGenOutputUrl(e.target.value)}
                  className="w-full bg-void/50 border border-muted-purple/60 px-4 py-2.5 rounded-lg text-xs text-white font-mono glow-input"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-accent to-purple-accent text-white font-bold text-xs transition-all flex items-center justify-center gap-2 glow-btn-fuchsia disabled:opacity-50 cursor-pointer"
              >
                {submittingAction ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Save Generation Changes</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PAYMENT STATUS */}
      {editPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface border border-muted-purple/60 rounded-2xl p-6 relative flex flex-col gap-5 shadow-2xl">
            <button 
              onClick={() => setEditPayment(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">UPI Receipt Verification</h3>
              <p className="text-[11px] text-foreground-muted font-mono truncate">{editPayment.email}</p>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs text-foreground-muted bg-void/50 border border-muted-purple/40 rounded-xl p-4">
              <div className="flex justify-between">
                <span>UTR Reference:</span>
                <span className="text-white font-bold select-all">{editPayment.upi_txn_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="text-emerald-400 font-extrabold text-sm">₹{Number(editPayment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  editPayment.status === "completed" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : editPayment.status === "pending"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>{editPayment.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Date Logged:</span>
                <span>{new Date(editPayment.created_at).toLocaleString()}</span>
              </div>
            </div>

            {editPayment.status === "pending" ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleApprovePayment(editPayment);
                      setEditPayment(null);
                    }}
                    disabled={submittingAction}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Approve & Credit
                  </button>
                  <button
                    onClick={() => {
                      handleRejectPayment(editPayment);
                      setEditPayment(null);
                    }}
                    disabled={submittingAction}
                    className="flex-1 py-2.5 rounded-lg bg-red-900/60 border border-red-500/30 hover:bg-red-950 text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reject Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-center py-2">
                <p className="text-[10px] text-zinc-500 font-mono">
                  This transaction has already been settled as <strong className="text-white">{editPayment.status.toUpperCase()}</strong>. Balance audit trails are locked.
                </p>
                <button
                  onClick={() => setEditPayment(null)}
                  className="w-full py-2 mt-2 rounded-lg bg-void/80 border border-muted-purple/60 hover:text-white text-zinc-400 text-xs transition-colors cursor-pointer"
                >
                  Close View
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-surface border border-red-500/40 rounded-2xl p-6 relative flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-muted-purple/30 pb-3 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold uppercase tracking-wider">Confirm Deletion</h3>
            </div>

            <p className="text-xs text-foreground-muted font-mono leading-relaxed">
              Are you sure you want to delete this {deleteTarget.type} record from the database? 
              <br />
              <span className="text-zinc-500 text-[10px] break-all">ID: {deleteTarget.id}</span>
              <br />
              <strong className="text-red-400">This action is irreversible.</strong>
            </p>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-muted-purple bg-void/50 text-xs font-semibold text-white hover:border-zinc-500 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={submittingAction}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingAction ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
