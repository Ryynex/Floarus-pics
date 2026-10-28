"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
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
import { clearAuthCookie } from "@/lib/authCookie";

const PAGE_SIZE = 50;

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

interface DashboardStats {
  total_users: number;
  total_balance: number;
  total_generations: number;
  completed_revenue: number;
}

function statusPillClass(status: string) {
  if (status === "completed") return "pill-success";
  if (status === "pending" || status === "processing") return "pill-warning";
  return "pill-danger";
}

function PaginationBar({
  page,
  totalCount,
  pageSize,
  canGoPrev,
  canGoNext,
  onPageChange,
}: {
  page: number;
  totalCount: number;
  pageSize: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPageChange: (next: number) => void;
}) {
  if (totalCount <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 bg-sand/40">
      <span className="text-[11px] text-ink-faint">
        Page {page + 1} of {totalPages} · {totalCount} rows total
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={!canGoPrev}
          className="btn-secondary px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          className="btn-secondary px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
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

  // Pagination + aggregate stats (exact counts come from the server; the
  // overview cards use admin_dashboard_stats() instead of summing one page)
  const [page, setPage] = useState<number>(0);
  const [counts, setCounts] = useState({ users: 0, generations: 0, payments: 0 });
  const [stats, setStats] = useState<DashboardStats | null>(null);

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

  const [createPaymentUser, setCreatePaymentUser] = useState<Profile | null>(null);
  const [createPaymentAmount, setCreatePaymentAmount] = useState<string>("");
  const [createPaymentTxnId, setCreatePaymentTxnId] = useState<string>("");
  const [createPaymentStatus, setCreatePaymentStatus] = useState<string>("completed");

  const [deleteTarget, setDeleteTarget] = useState<{ type: "user" | "generation" | "payment"; id: string } | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Track pending timeouts so none outlive the page
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      redirectTimers.current.forEach(t => clearTimeout(t));
      redirectTimers.current = [];
    };
  }, []);

  // Utility to trigger quick floating messages
  const showFeedback = (type: "success" | "error", text: string) => {
    setActionFeedback({ type, text });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  const scheduleRedirect = (path: string) => {
    redirectTimers.current.push(
      setTimeout(() => {
        router.replace(path);
      }, 2500)
    );
  };

  // Resolve display emails for a page of rows without loading every profile
  const emailMapFor = async (userIds: string[]): Promise<{ [key: string]: string | null }> => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", uniqueIds);
    if (error || !data) {
      if (error) console.warn("Email lookup failed:", error.message);
      return {};
    }
    const map: { [key: string]: string | null } = {};
    data.forEach(p => { map[p.id] = p.email; });
    return map;
  };

  // Fetch only the active view, paginated server-side
  const fetchActiveView = useCallback(async () => {
    try {
      setLoadingData(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (currentTab === "overview") {
        const [statsRes, gensRes, usersCountRes, gensCountRes, paysCountRes] = await Promise.all([
          supabase.rpc("admin_dashboard_stats"),
          supabase
            .from("generations")
            .select("id, user_id, prompt, garment_url, face_url, output_url, status, cost_inr, created_at")
            .order("created_at", { ascending: false })
            .limit(4),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("generations").select("id", { count: "exact", head: true }),
          supabase.from("payments").select("id", { count: "exact", head: true }),
        ]);

        if (statsRes.error) {
          console.warn("admin_dashboard_stats unavailable:", statsRes.error.message);
          setStats(null);
        } else {
          // PostgREST returns a set-returning function as an array even for a
          // single row; without unwrapping it every overview card renders "—".
          const rows = statsRes.data as DashboardStats[] | DashboardStats | null;
          setStats(Array.isArray(rows) ? rows[0] ?? null : rows);
        }
        if (gensRes.error) throw gensRes.error;

        const gens = gensRes.data || [];
        const map = await emailMapFor(gens.map(g => g.user_id));
        setGenerationsList(gens.map(g => ({ ...g, email: map[g.user_id] || "Unknown User" })));
        setUsersList([]);
        setPaymentsList([]);
        setCounts({
          users: usersCountRes.count || 0,
          generations: gensCountRes.count || 0,
          payments: paysCountRes.count || 0,
        });
        return;
      }

      if (currentTab === "users") {
        const { data, error, count } = await supabase
          .from("profiles")
          .select("id, email, balance_inr, updated_at", { count: "exact" })
          .order("updated_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        setUsersList(data || []);
        setCounts(prev => ({ ...prev, users: count || 0 }));
        setGenerationsList([]);
        setPaymentsList([]);
        return;
      }

      if (currentTab === "generations") {
        const { data, error, count } = await supabase
          .from("generations")
          .select("id, user_id, prompt, garment_url, face_url, output_url, status, cost_inr, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        const map = await emailMapFor((data || []).map(g => g.user_id));
        setGenerationsList((data || []).map(g => ({ ...g, email: map[g.user_id] || "Unknown User" })));
        setCounts(prev => ({ ...prev, generations: count || 0 }));
        setUsersList([]);
        setPaymentsList([]);
        return;
      }

      if (currentTab === "payments") {
        const { data, error, count } = await supabase
          .from("payments")
          .select("id, user_id, amount, upi_txn_id, status, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        const map = await emailMapFor((data || []).map(p => p.user_id));
        setPaymentsList((data || []).map(p => ({ ...p, email: map[p.user_id] || "Unknown User" })));
        setCounts(prev => ({ ...prev, payments: count || 0 }));
        setUsersList([]);
        setGenerationsList([]);
        return;
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showFeedback("error", "Failed to reload dashboard data.");
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [currentTab, page]);

  // Refetch whenever the tab or page changes (after the admin is verified).
  // The fetch is deferred a microtask so the loading flag is not set
  // synchronously inside the effect body.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fetchActiveView();
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, fetchActiveView]);

  // If rows were deleted and the current page no longer exists, step back
  useEffect(() => {
    const loadedRows =
      currentTab === "users" ? usersList.length :
      currentTab === "generations" ? generationsList.length :
      currentTab === "payments" ? paymentsList.length : 0;
    if (currentTab !== "overview" && !loadingData && page > 0 && loadedRows === 0) {
      queueMicrotask(() => setPage(p => Math.max(0, p - 1)));
    }
  }, [currentTab, loadingData, page, usersList.length, generationsList.length, paymentsList.length]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveView();
  };

  // Authenticate Admin User
  // Declared after fetchDashboardData/showFeedback so it does not reference
  // const declarations before they are initialised.
  useEffect(() => {
    async function verifyAdmin() {
      try {
        // Server-side middleware already verified this route; getUser() here
        // re-validates the token instead of trusting the stored session copy.
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          // `profiles.is_admin` is the single source of truth (the proxy and
          // every RPC use it). Hardcoding one email here locked out any other
          // admin the database had authorised.
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

          if (!profileError && profile?.is_admin === true) {
            setIsAdmin(true);
            setAdminEmail(user.email ?? null);
            // Data loading is driven by the fetch effect below
          } else {
            setIsAdmin(false);
            setAuthError("Unauthorized user. Redirecting...");
            scheduleRedirect("/dashboard");
          }
        } else {
          setIsAdmin(false);
          setAuthError("Not logged in. Redirecting to home...");
          scheduleRedirect("/");
        }
      } catch (err) {
        console.error("Auth guard check exception:", err);
        setIsAdmin(false);
        setAuthError("Auth error occurred. Redirecting...");
        scheduleRedirect("/");
      }
    }
    verifyAdmin();
    // scheduleRedirect is a stable-per-render helper; re-running the whole
    // effect on identity change would re-verify auth and stack timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // -------------------------------------------------------------
  // Data modification handlers
  // -------------------------------------------------------------

  // Edit user balance manually
  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBalanceUser || !newBalanceValue) return;

    setSubmittingAction(true);
    const targetUserId = editBalanceUser.id;
    const newBalance = parseFloat(newBalanceValue);

    if (isNaN(newBalance) || newBalance < 0) {
      showFeedback("error", "Please enter a valid non-negative balance.");
      setSubmittingAction(false);
      return;
    }

    try {
      // Single security-definer RPC: sets the balance, writes the ledger row
      // and the admin audit log atomically. No client-side multi-step writes.
      const { error: rpcError } = await supabase.rpc("admin_set_balance", {
        p_user_id: targetUserId,
        p_new_balance: newBalance,
      });

      if (rpcError) throw rpcError;

      showFeedback("success", `Successfully updated balance for ${editBalanceUser.email} to ₹${newBalance.toFixed(2)}.`);
      setEditBalanceUser(null);
      setNewBalanceValue("");
      fetchActiveView();
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
      fetchActiveView();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Error occurred while updating generation details.");
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
      // Atomic RPC: marks the payment completed AND credits the wallet in one
      // transaction, guarded so a pending payment can only be approved once.
      const { error: rpcError } = await supabase.rpc("admin_approve_payment", {
        p_payment_id: pay.id,
      });

      if (rpcError) throw rpcError;

      showFeedback("success", `Approved transaction ${pay.upi_txn_id}. Credited +₹${Number(pay.amount).toFixed(2)} to user's wallet.`);
      fetchActiveView();
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
      const { error: rpcError } = await supabase.rpc("admin_reject_payment", {
        p_payment_id: pay.id,
      });

      if (rpcError) throw rpcError;

      showFeedback("success", `Rejected transaction ${pay.upi_txn_id}.`);
      fetchActiveView();
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
      // Single RPC: inserts the ledger row and, when status is completed,
      // credits the wallet in the same transaction.
      const { error: rpcError } = await supabase.rpc("admin_log_payment", {
        p_user_id: createPaymentUser.id,
        p_amount: amount,
        p_upi_txn_id: createPaymentTxnId,
        p_status: createPaymentStatus,
      });

      if (rpcError) throw rpcError;

      if (createPaymentStatus === "completed") {
        showFeedback("success", `Log entry added. Automatically added +₹${amount.toFixed(2)} to ${createPaymentUser.email}.`);
      } else {
        showFeedback("success", "Pending transaction log recorded successfully.");
      }

      setCreatePaymentUser(null);
      setCreatePaymentAmount("");
      setCreatePaymentTxnId("");
      setCreatePaymentStatus("completed");
      fetchActiveView();
    } catch (err) {
      console.error(err);
      showFeedback("error", err instanceof Error && err.message.includes("unique")
        ? "Transaction ID already exists."
        : "Failed to create manual payment log.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Storage rows have no FK to auth.users, so a user's uploads survived the
  // account and stayed publicly readable. Walk their folder in both buckets and
  // remove every object first (admin policies permit list + delete).
  const deleteUserStorage = async (userId: string): Promise<void> => {
    const buckets = ["generated-lookbooks", "garments"] as const;
    for (const bucket of buckets) {
      const walk = async (prefix: string, depth: number): Promise<void> => {
        if (depth > 4) return;
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
        if (error || !data?.length) return;
        const files = data.filter((item) => item.id !== null).map((item) => `${prefix}/${item.name}`);
        const folders = data.filter((item) => item.id === null).map((item) => item.name);
        if (files.length > 0) {
          const { error: removeError } = await supabase.storage.from(bucket).remove(files);
          if (removeError) {
            console.warn(`Storage cleanup failed for ${bucket}:`, removeError.message);
          }
        }
        for (const folder of folders) {
          await walk(`${prefix}/${folder}`, depth + 1);
        }
      };
      await walk(userId, 0);
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
        // Deletes the auth user, profile, generations and payments (cascade),
        // plus the storage objects, which have no foreign key to cascade from.
        await deleteUserStorage(id);
        const { error: err } = await supabase.rpc("admin_delete_user", {
          p_user_id: id,
        });
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
      fetchActiveView();
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

  // Overview numbers come from admin_dashboard_stats() so they cover the whole
  // database, not just the page currently loaded below.
  const totalUsers = stats?.total_users ?? null;
  const totalBalance = stats?.total_balance ?? null;
  const totalGens = stats?.total_generations ?? null;
  const totalRevenue = stats?.completed_revenue ?? null;

  const canGoPrev = page > 0;
  const canGoNext =
    (currentTab === "users" && (page + 1) * PAGE_SIZE < counts.users) ||
    (currentTab === "generations" && (page + 1) * PAGE_SIZE < counts.generations) ||
    (currentTab === "payments" && (page + 1) * PAGE_SIZE < counts.payments);

  const fmtAmount = (value: number | null) =>
    value === null
      ? "—"
      : `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <div className="h-12 w-12 flex items-center justify-center animate-pulse">
          <img src="/images/florus_logo.png" alt="Florus Logo" className="h-12 w-12 object-contain" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-[0.2em] text-ink">FLORUS.PICS</h2>
          <p className="text-xs text-ink-faint uppercase tracking-widest animate-pulse mt-1">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Return Error Screen if unauthorized
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-void w-full flex flex-col justify-center items-center gap-4 text-center px-4">
        <div className="h-12 w-12 rounded-xl border border-brick/30 bg-brick-soft text-brick flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <h2 className="text-xl font-bold text-ink">Access Denied</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            {authError || "This subdomain requires administrative credentials."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-void flex flex-col overflow-x-hidden text-sm">

      {/* Admin Floating Banner Feedback */}
      {actionFeedback && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border flex items-center gap-3 shadow-lg max-w-md animate-fade-in ${
          actionFeedback.type === "success"
            ? "bg-sage-soft border-sage/25 text-sage"
            : "bg-brick-soft border-brick/25 text-brick"
        }`}>
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <span className="text-xs font-medium">{actionFeedback.text}</span>
        </div>
      )}

      {/* Main Admin layout */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 flex flex-col gap-6 z-10">

        {/* Header bar */}
        <header className="card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="pill-neutral text-xs font-semibold tracking-wide px-2 py-0.5 rounded">
                ADMIN CONTROL
              </span>
              <span className="text-xs text-ink-faint">God Mode v2.4</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
              FLORUS.PICS <span className="text-ink-faint font-normal">·</span> <span className="text-fuchsia-accent">ADMIN DASHBOARD</span>
            </h1>
            <p className="text-xs text-ink-soft">
              Root Authentication: <span className="text-sage font-semibold">{adminEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Sync Database</span>
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut();
                clearAuthCookie();
                router.replace("/");
              }}
              className="btn-secondary px-4 py-2.5 rounded-xl text-sm font-medium text-brick hover:bg-brick-soft hover:border-brick/30 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Exit Portal</span>
            </button>
          </div>
        </header>

        {/* Tab Selection Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-sand border border-muted-purple p-1.5 rounded-2xl">
          {([
            { key: "overview", label: "overview", count: null },
            { key: "users", label: "users", count: counts.users },
            { key: "generations", label: "generations", count: counts.generations },
            { key: "payments", label: "payments", count: counts.payments },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setCurrentTab(tab.key); setSearchQuery(""); setPage(0); }}
              className={`py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer uppercase tracking-wide ${
                currentTab === tab.key
                  ? "bg-surface text-ink border border-line shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1.5 text-[10px] font-bold text-fuchsia-accent">{tab.count}</span>
              )}
            </button>
          ))}
        </section>

        {/* Dynamic Context Tabs */}
        {loadingData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 card">
            <RefreshCw className="h-8 w-8 text-fuchsia-accent animate-spin" />
            <span className="text-xs text-ink-faint uppercase tracking-widest">Loading data records...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">

            {/* SEARCH BANNER IF NOT OVERVIEW */}
            {currentTab !== "overview" && (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
                <input
                  type="text"
                  placeholder={`Search this page of ${currentTab} by user email, database IDs, transactions, prompts...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-11 py-3.5"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
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
                  <div className="card p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-clay-soft border border-line flex items-center justify-center text-fuchsia-accent">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="label-caps">Registered Profiles</span>
                    <span className="text-3xl font-extrabold text-ink">{totalUsers ?? "—"}</span>
                  </div>

                  <div className="card p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-gold-soft border border-line flex items-center justify-center text-purple-accent">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="label-caps">Wallet Balances</span>
                    <span className="text-3xl font-extrabold text-ink">{fmtAmount(totalBalance)}</span>
                  </div>

                  <div className="card p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-sand border border-line flex items-center justify-center text-amber-warm">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <span className="label-caps">Image Generations</span>
                    <span className="text-3xl font-extrabold text-ink">{totalGens ?? "—"}</span>
                  </div>

                  <div className="card p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-sage-soft border border-line flex items-center justify-center text-sage">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="label-caps">Transactions Income</span>
                    <span className="text-3xl font-extrabold text-sage">{fmtAmount(totalRevenue)}</span>
                  </div>
                </div>

                {/* Dashboard logs grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Left Column: Recent Activity Feed */}
                  <div className="lg:col-span-8 card p-5 flex flex-col gap-4">
                    <div className="border-b border-line pb-3 flex justify-between items-center">
                      <h3 className="font-bold text-ink uppercase tracking-wide text-xs">Recent Platform Generations</h3>
                      <button onClick={() => setCurrentTab("generations")} className="text-xs text-fuchsia-accent font-semibold hover:underline">View All</button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {generationsList.slice(0, 4).length === 0 ? (
                        <span className="text-ink-faint text-xs text-center py-6">No recent generations.</span>
                      ) : (
                        generationsList.slice(0, 4).map((g) => (
                          <div key={g.id} className="bg-sand border border-muted-purple p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-ink-faint select-all truncate">{g.email}</span>
                              <span className="text-ink font-medium truncate max-w-sm">{g.prompt}</span>
                              <span className="text-ink-faint text-[10px]">{new Date(g.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusPillClass(g.status)}`}>
                                {g.status}
                              </span>
                              <span className="text-ink font-bold text-right">₹{Number(g.cost_inr).toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Key Alerts / Database Diagnostics */}
                  <div className="lg:col-span-4 flex flex-col gap-6">

                    <div className="card p-5 flex flex-col gap-4">
                      <div className="border-b border-line pb-3">
                        <h3 className="font-bold text-ink uppercase tracking-wide text-xs">System Diagnostics</h3>
                      </div>
                      <div className="flex flex-col gap-3 text-xs text-ink-soft">
                        <div className="flex justify-between items-center border-b border-line pb-2">
                          <span>Admin RPC Access</span>
                          <span className="text-sage font-semibold flex items-center gap-1"><Database className="h-3 w-3" /> GRANTED</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-line pb-2">
                          <span>Profiles Table</span>
                          <span className="text-ink">{counts.users} rows</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-line pb-2">
                          <span>Generations Table</span>
                          <span className="text-ink">{counts.generations} rows</span>
                        </div>
                        <div className="flex justify-between items-center pb-1">
                          <span>Payments Table</span>
                          <span className="text-ink">{counts.payments} rows</span>
                        </div>
                      </div>
                    </div>

                    <div className="card p-5 flex flex-col gap-3.5">
                      <h4 className="font-bold text-ink uppercase tracking-wide text-xs flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-purple-accent" /> Control Warnings
                      </h4>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        You have root privileges. Editing balances, payments, or deleting tables modifies live user experiences instantly. Actions are permanent.
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* USERS TAB */}
            {currentTab === "users" && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-ink-faint text-xs">No registered user profiles found matching filters.</div>
                  ) : (
                    <table className="w-full data-table text-xs">
                      <thead>
                        <tr>
                          <th>User Email / Reference Key</th>
                          <th className="text-right">Wallet Balance</th>
                          <th>Last Balance Sync</th>
                          <th className="text-right">System Controls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="flex flex-col">
                                <span className="text-ink font-semibold select-all">{u.email}</span>
                                <span className="text-[9px] text-ink-faint mt-1 select-all">{u.id}</span>
                              </div>
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <span className="text-ink font-bold text-sm">₹{Number(u.balance_inr).toFixed(2)}</span>
                            </td>
                            <td className="whitespace-nowrap">
                              {u.updated_at ? new Date(u.updated_at).toLocaleString() : "Never"}
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditBalanceUser(u);
                                    setNewBalanceValue(u.balance_inr.toString());
                                  }}
                                  className="btn-secondary px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1"
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
                                  className="btn-secondary px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-sage hover:bg-sage-soft hover:border-sage/30 flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Log UPI
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({ type: "user", id: u.id })}
                                  className="btn-secondary p-1.5 rounded-lg text-brick hover:bg-brick-soft hover:border-brick/30"
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
                <PaginationBar
                  page={page}
                  totalCount={counts.users}
                  pageSize={PAGE_SIZE}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPageChange={setPage}
                />
              </div>
            )}

            {/* GENERATIONS TAB */}
            {currentTab === "generations" && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  {filteredGens.length === 0 ? (
                    <div className="py-12 text-center text-ink-faint text-xs">No generation logs found matching search.</div>
                  ) : (
                    <table className="w-full data-table text-xs">
                      <thead>
                        <tr>
                          <th>User Email / Date</th>
                          <th>Model Run Prompt</th>
                          <th>Inputs & Output URL previews</th>
                          <th className="text-center">Status</th>
                          <th className="text-right">Cost (INR)</th>
                          <th className="text-right">Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGens.map((g) => (
                          <tr key={g.id}>
                            <td className="whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-ink font-semibold select-all">{g.email}</span>
                                <span className="text-[9px] text-ink-faint mt-1 select-all">{new Date(g.created_at).toLocaleString()}</span>
                                <span className="text-[9px] text-ink-faint mt-0.5 select-all">{g.id}</span>
                              </div>
                            </td>
                            <td className="max-w-xs truncate" title={g.prompt}>
                              <span className="text-ink font-medium">{g.prompt}</span>
                            </td>
                            <td>
                              <div className="flex flex-col gap-1.5 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-ink-faint w-14">Garment:</span>
                                  <a href={g.garment_url} target="_blank" rel="noreferrer" className="text-fuchsia-accent hover:underline truncate max-w-[200px]" title={g.garment_url}>
                                    {g.garment_url.split("/").pop()}
                                  </a>
                                </div>
                                {g.face_url && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-ink-faint w-14">Face:</span>
                                    <a href={g.face_url} target="_blank" rel="noreferrer" className="text-purple-accent hover:underline truncate max-w-[200px]" title={g.face_url}>
                                      {g.face_url.split("/").pop()}
                                    </a>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-ink-faint w-14">Output:</span>
                                  {g.output_url ? (
                                    <a href={g.output_url} target="_blank" rel="noreferrer" className="text-sage hover:underline truncate max-w-[200px]" title={g.output_url}>
                                      {g.output_url.split("/").pop()}
                                    </a>
                                  ) : (
                                    <span className="text-ink-faint">Pending upload</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusPillClass(g.status)}`}>
                                {g.status}
                              </span>
                            </td>
                            <td className="text-right font-bold text-ink whitespace-nowrap">
                              ₹{Number(g.cost_inr).toFixed(2)}
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditGen(g);
                                    setEditGenStatus(g.status);
                                    setEditGenCost(g.cost_inr.toString());
                                    setEditGenOutputUrl(g.output_url || "");
                                  }}
                                  className="btn-secondary px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                                >
                                  <Edit2 className="h-3 w-3" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({ type: "generation", id: g.id })}
                                  className="btn-secondary p-1.5 rounded-lg text-brick hover:bg-brick-soft hover:border-brick/30"
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
                <PaginationBar
                  page={page}
                  totalCount={counts.generations}
                  pageSize={PAGE_SIZE}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPageChange={setPage}
                />
              </div>
            )}

            {/* PAYMENTS TAB */}
            {currentTab === "payments" && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  {filteredPays.length === 0 ? (
                    <div className="py-12 text-center text-ink-faint text-xs">No transaction records found matching search.</div>
                  ) : (
                    <table className="w-full data-table text-xs">
                      <thead>
                        <tr>
                          <th>User Email / Reference Key</th>
                          <th>UPI Transaction ID</th>
                          <th className="text-right">Replenish Amount</th>
                          <th>Receipt Date</th>
                          <th className="text-center">Status</th>
                          <th className="text-right">Control Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPays.map((p) => (
                          <tr key={p.id}>
                            <td className="whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-ink font-semibold select-all">{p.email}</span>
                                <span className="text-[9px] text-ink-faint mt-1 select-all">{p.user_id}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap">
                              <span className="text-ink font-semibold tracking-wide select-all">{p.upi_txn_id}</span>
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <span className="text-sage font-bold text-sm">+₹{Number(p.amount).toFixed(2)}</span>
                            </td>
                            <td className="whitespace-nowrap">
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                            <td className="text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusPillClass(p.status)}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {p.status === "pending" ? (
                                  <>
                                    <button
                                      onClick={() => handleApprovePayment(p)}
                                      disabled={submittingAction}
                                      className="btn-secondary px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-sage hover:bg-sage-soft hover:border-sage/30 flex items-center gap-1 disabled:opacity-50"
                                      title="Approve & Credit Balance"
                                    >
                                      <Check className="h-3 w-3" /> Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectPayment(p)}
                                      disabled={submittingAction}
                                      className="btn-secondary px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-brick hover:bg-brick-soft hover:border-brick/30 flex items-center gap-1 disabled:opacity-50"
                                      title="Reject Payment"
                                    >
                                      <X className="h-3 w-3" /> Reject
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditPayment(p);
                                    }}
                                    className="btn-secondary px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                                  >
                                    <Edit2 className="h-3 w-3" /> View Status
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteTarget({ type: "payment", id: p.id })}
                                  className="btn-secondary p-1.5 rounded-lg text-brick hover:bg-brick-soft hover:border-brick/30"
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
                <PaginationBar
                  page={page}
                  totalCount={counts.payments}
                  pageSize={PAGE_SIZE}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPageChange={setPage}
                />
              </div>
            )}

          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="w-full border-t border-line bg-sand/50 py-6 text-center text-xs text-ink-faint mt-12 z-10">
        <span>© {new Date().getFullYear()} Florus.pics · Admin console</span>
      </footer>

      {/* =============================================================
          MODAL INTERFACES
          ============================================================= */}

      {/* MODAL: EDIT BALANCE */}
      {editBalanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 relative flex flex-col gap-5">
            <button
              onClick={() => setEditBalanceUser(null)}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-ink uppercase tracking-wide">Adjust Wallet Credit</h3>
              <p className="text-xs text-ink-soft truncate">{editBalanceUser.email}</p>
            </div>

            <form onSubmit={handleUpdateBalance} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="label-caps">Current Balance</label>
                <div className="w-full bg-sand border border-muted-purple px-4 py-2.5 rounded-lg text-xs font-bold text-ink">
                  ₹{Number(editBalanceUser.balance_inr).toFixed(2)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="label-caps">New Credit Balance (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500.00"
                  value={newBalanceValue}
                  onChange={(e) => setNewBalanceValue(e.target.value)}
                  className="input-field glow-input"
                />
              </div>

              <div className="flex items-start gap-2 bg-gold-soft/60 border border-purple-accent/25 p-3 rounded-lg text-xs leading-relaxed text-purple-accent">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Saving will adjust the wallet and automatically log a matching completed transaction in the payments tab.</span>
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="btn-primary w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
              >
                {submittingAction ? (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 relative flex flex-col gap-5">
            <button
              onClick={() => setCreatePaymentUser(null)}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-ink uppercase tracking-wide">Log Manual UPI Payment</h3>
              <p className="text-xs text-ink-soft truncate">{createPaymentUser.email}</p>
            </div>

            <form onSubmit={handleCreatePayment} className="flex flex-col gap-4">

              <div className="flex flex-col gap-2">
                <label className="label-caps">Replenish Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1000.00"
                  value={createPaymentAmount}
                  onChange={(e) => setCreatePaymentAmount(e.target.value)}
                  className="input-field glow-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="label-caps">UPI Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI8273618491"
                  value={createPaymentTxnId}
                  onChange={(e) => setCreatePaymentTxnId(e.target.value)}
                  className="input-field glow-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="label-caps">Status</label>
                <select
                  value={createPaymentStatus}
                  onChange={(e) => setCreatePaymentStatus(e.target.value)}
                  className="input-field glow-input"
                >
                  <option value="completed" className="bg-surface">Completed (Instantly credits balance)</option>
                  <option value="pending" className="bg-surface">Pending (Must be approved later)</option>
                  <option value="failed" className="bg-surface">Failed (Declined/audit purposes)</option>
                </select>
              </div>

              <div className="flex items-start gap-2 bg-sage-soft/70 border border-sage/25 p-3 rounded-lg text-xs leading-relaxed text-sage">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Marking status as &apos;Completed&apos; will instantly increase the user&apos;s current wallet balance by the transaction amount.</span>
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="btn-primary w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
              >
                {submittingAction ? (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 relative flex flex-col gap-5">
            <button
              onClick={() => setEditGen(null)}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-ink uppercase tracking-wide">Update Model Generation</h3>
              <p className="text-xs text-ink-soft truncate">{editGen.email}</p>
            </div>

            <form onSubmit={handleUpdateGeneration} className="flex flex-col gap-4">

              <div className="flex flex-col gap-2">
                <label className="label-caps">Status</label>
                <select
                  value={editGenStatus}
                  onChange={(e) => setEditGenStatus(e.target.value)}
                  className="input-field glow-input"
                >
                  <option value="pending" className="bg-surface">Pending</option>
                  <option value="processing" className="bg-surface">Processing</option>
                  <option value="completed" className="bg-surface">Completed</option>
                  <option value="failed" className="bg-surface">Failed</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="label-caps">Cost (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 50.00"
                  value={editGenCost}
                  onChange={(e) => setEditGenCost(e.target.value)}
                  className="input-field glow-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="label-caps">Generated Output Image URL</label>
                <input
                  type="text"
                  placeholder="Paste image asset URL"
                  value={editGenOutputUrl}
                  onChange={(e) => setEditGenOutputUrl(e.target.value)}
                  className="input-field glow-input"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="btn-primary w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
              >
                {submittingAction ? (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 relative flex flex-col gap-5">
            <button
              onClick={() => setEditPayment(null)}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-ink uppercase tracking-wide">UPI Receipt Verification</h3>
              <p className="text-xs text-ink-soft truncate">{editPayment.email}</p>
            </div>

            <div className="flex flex-col gap-3 text-xs text-ink-soft bg-sand border border-muted-purple rounded-xl p-4">
              <div className="flex justify-between">
                <span>UTR Reference:</span>
                <span className="text-ink font-bold select-all">{editPayment.upi_txn_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="text-sage font-bold text-sm">₹{Number(editPayment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className={`px-2 py-0.5 rounded font-semibold capitalize ${statusPillClass(editPayment.status)}`}>{editPayment.status}</span>
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
                    className="flex-1 py-2.5 rounded-lg bg-sage hover:bg-sage/90 text-[#05130A] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Approve & Credit
                  </button>
                  <button
                    onClick={() => {
                      handleRejectPayment(editPayment);
                      setEditPayment(null);
                    }}
                    disabled={submittingAction}
                    className="flex-1 py-2.5 rounded-lg bg-brick-soft border border-brick/30 hover:bg-brick hover:text-white text-brick font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reject Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-center py-2">
                <p className="text-xs text-ink-faint">
                  This transaction has already been settled as <strong className="text-ink">{editPayment.status.toUpperCase()}</strong>. Balance audit trails are locked.
                </p>
                <button
                  onClick={() => setEditPayment(null)}
                  className="btn-secondary w-full py-2 mt-2 rounded-lg text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 relative flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-line pb-3 text-brick">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold uppercase tracking-wide">Confirm Deletion</h3>
            </div>

            <p className="text-sm text-ink-soft leading-relaxed">
              Are you sure you want to delete this {deleteTarget.type} record from the database?
              <br />
              <span className="text-ink-faint text-xs break-all">ID: {deleteTarget.id}</span>
              <br />
              <strong className="text-brick">This action is irreversible.</strong>
            </p>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary flex-1 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={submittingAction}
                className="flex-1 py-2 rounded-lg bg-brick hover:bg-brick/90 text-[#05130A] font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
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
