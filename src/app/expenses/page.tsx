"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import LandingPage from "@/components/LandingPage";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from "@/app/actions/expenses";
import {
  Mic,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  DollarSign,
  MapPin,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  X,
  Check,
  Loader2,
  TrendingDown,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  quantity: string | null;
  location: string | null;
  type: string;
  paymentMode: string;
  metadata?: any;
};

const CATEGORIES = [
  "Food",
  "Travel",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Investment",
  "Others"
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Food: { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500" },
  Travel: { bg: "bg-sky-100", text: "text-sky-700", bar: "bg-sky-500" },
  Utilities: { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
  Shopping: { bg: "bg-pink-100", text: "text-pink-700", bar: "bg-pink-500" },
  Entertainment: { bg: "bg-purple-100", text: "text-purple-700", bar: "bg-purple-500" },
  Health: { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" },
  Investment: { bg: "bg-teal-100", text: "text-teal-700", bar: "bg-teal-500" },
  Others: { bg: "bg-stone-100", text: "text-stone-700", bar: "bg-stone-500" }
};

export default function ExpenseTrackerPage() {
  const { status: authStatus } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  // Voice Interaction State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceResult, setVoiceResult] = useState<any | null>(null);
  const [rawTranscript, setRawTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fast-Add Manual Form State
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCategory, setManualCategory] = useState("Food");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualPaymentMode, setManualPaymentMode] = useState("CASH");
  const [manualType, setManualType] = useState("DEBIT");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Verification/Editing Modal State (Used for confirming Voice Extract)
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchExpensesList();
    }
  }, [authStatus]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const fetchExpensesList = async () => {
    try {
      const data = await getExpenses();
      // Format backend dates
      const formatted = (data as any[]).map((e) => ({
        ...e,
        date: e.date instanceof Date ? e.date.toISOString().split("T")[0] : new Date(e.date).toISOString().split("T")[0]
      }));
      setExpenses(formatted);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  // Voice capture handlers
  const startRecording = async () => {
    try {
      setVoiceResult(null);
      setRawTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        processVoiceExpense(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setShowVoiceModal(true);
    } catch (err) {
      toast.error("Microphone access denied. Check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const processVoiceExpense = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob);

      const response = await fetch("/api/ai/process-expense", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Error processing voice command");
      }

      const resData = await response.json();
      setRawTranscript(resData.transcript);
      if (resData.expense) {
        setVoiceResult(resData.expense);
        // Automatically set fields in the editing/confirmation modal
        setEditingExpense({
          amount: resData.expense.amount || 0,
          description: resData.expense.description || "Voice Entry",
          category: resData.expense.category || "Others",
          date: resData.expense.date || new Date().toISOString().split("T")[0],
          quantity: resData.expense.quantity || "?",
          location: resData.expense.location || "?",
          type: resData.expense.type || "DEBIT",
          paymentMode: resData.expense.paymentMode || "CASH"
        });
      } else {
        toast.error("Could not parse transaction details. Please try manually.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze voice data");
      setShowVoiceModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // CRUD actions
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || isNaN(parseFloat(manualAmount))) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!manualDesc.trim()) {
      toast.error("Please enter a description.");
      return;
    }

    setIsAddingManual(true);
    try {
      const res = await createExpense({
        amount: parseFloat(manualAmount),
        description: manualDesc.trim(),
        category: manualCategory,
        date: manualDate,
        quantity: manualQuantity.trim() || "?",
        location: manualLocation.trim() || "?",
        type: manualType,
        paymentMode: manualPaymentMode,
        metadata: { source: "manual" }
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Expense logged successfully!");
        setManualAmount("");
        setManualDesc("");
        setManualQuantity("");
        setManualLocation("");
        fetchExpensesList();
      }
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error occurred.");
    } finally {
      setIsAddingManual(false);
    }
  };

  const handleConfirmEditOrVoice = async () => {
    if (!editingExpense || !editingExpense.amount || !editingExpense.description) {
      toast.error("Amount and Description are required.");
      return;
    }

    setIsSavingEdit(true);
    try {
      if (editingExpense.id) {
        // Mode: Updating existing
        const res = await updateExpense(editingExpense.id, {
          amount: parseFloat(editingExpense.amount.toString()),
          description: editingExpense.description,
          category: editingExpense.category,
          date: editingExpense.date,
          quantity: editingExpense.quantity || "?",
          location: editingExpense.location || "?",
          type: editingExpense.type,
          paymentMode: editingExpense.paymentMode
        });
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Expense updated!");
          setEditingExpense(null);
          fetchExpensesList();
        }
      } else {
        // Mode: Saving new Voice extract
        const res = await createExpense({
          amount: parseFloat(editingExpense.amount.toString()),
          description: editingExpense.description,
          category: editingExpense.category || "Others",
          date: editingExpense.date,
          quantity: editingExpense.quantity || "?",
          location: editingExpense.location || "?",
          type: editingExpense.type || "DEBIT",
          paymentMode: editingExpense.paymentMode || "CASH",
          metadata: { transcript: rawTranscript, source: "voice" }
        });
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Voice expense saved!");
          setEditingExpense(null);
          setShowVoiceModal(false);
          fetchExpensesList();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await deleteExpense(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Transaction deleted successfully!");
        fetchExpensesList();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete transaction.");
    }
  };

  // Compute Metrics
  const currentMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSpentDebit = currentMonthExpenses
    .filter((e) => e.type === "DEBIT")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalEarnedCredit = currentMonthExpenses
    .filter((e) => e.type === "CREDIT")
    .reduce((sum, e) => sum + e.amount, 0);

  // Compute category breakdown metrics
  const categoryTotals: Record<string, number> = {};
  CATEGORIES.forEach((cat) => {
    categoryTotals[cat] = 0;
  });

  expenses
    .filter((e) => e.type === "DEBIT")
    .forEach((e) => {
      const cat = e.category || "Others";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
    });

  const totalDebitAllTime = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Sorted and filtered list
  const filteredExpenses = expenses
    .filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.location || "").toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === "all" || e.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return 0;
    });

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fffcf9]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return <LandingPage />;
  }

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-4 py-8 md:px-8 bg-[#fffcf9]">
      
      {/* Header with Sober Premium Vibe */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 flex items-center gap-2">
            <TrendingDown className="w-8 h-8 text-orange-600" />
            Expense Tracker
          </h1>
          <p className="text-sm text-stone-500 mt-1 font-medium">
            Voice-first personal ledger for high-velocity tracking.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {/* Metric 1 */}
        <div className="relative overflow-hidden bg-white border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Total Spent (This Month)
          </p>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">
            ₹{totalSpentDebit.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-stone-500 font-medium">
            <span className="font-bold text-orange-600">₹{totalDebitAllTime.toLocaleString("en-IN")}</span> all-time debit.
          </div>
        </div>

        {/* Metric 2 */}
        <div className="relative overflow-hidden bg-white border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Total Income (This Month)
          </p>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">
            ₹{totalEarnedCredit.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-stone-500 font-medium">
            Cash, bank, and salary inflows.
          </div>
        </div>

        {/* Metric 3 */}
        <div className="relative overflow-hidden bg-white border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Total Transactions
          </p>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">
            {currentMonthExpenses.length}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-stone-500 font-medium">
            Avg volume: <span className="font-bold text-sky-600">{currentMonthExpenses.length > 0 ? (totalSpentDebit / currentMonthExpenses.length).toFixed(1) : 0}</span> ₹ / item
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Analytics & Fast entry */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Quick Manual Fast Add */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-stone-950 uppercase tracking-widest border-b border-stone-100 pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-500" />
              Quick Add Transaction
            </h2>
            <form onSubmit={handleSaveManual} className="mt-4 space-y-4">
              
              <div className="flex gap-2">
                {/* Type Selection */}
                <button
                  type="button"
                  onClick={() => setManualType("DEBIT")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    manualType === "DEBIT"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-stone-50 text-stone-600 border-stone-200/60"
                  }`}
                >
                  Debit
                </button>
                <button
                  type="button"
                  onClick={() => setManualType("CREDIT")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    manualType === "CREDIT"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-stone-50 text-stone-600 border-stone-200/60"
                  }`}
                >
                  Credit
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-extrabold text-stone-850 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="e.g. Potatoes, taxi, lunch bill"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-bold text-stone-750 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Pay Mode
                  </label>
                  <select
                    value={manualPaymentMode}
                    onChange={(e) => setManualPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(e.target.value)}
                    placeholder="e.g. 2kg (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-750 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="e.g. DMart (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-750 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isAddingManual}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
              >
                {isAddingManual ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Quick Log Expense</span>
              </button>

            </form>
          </div>

          {/* Spending Distribution Chart */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-stone-950 uppercase tracking-widest border-b border-stone-100 pb-3">
              Spending Distribution
            </h2>
            <div className="mt-4 space-y-4">
              {CATEGORIES.map((cat) => {
                const amount = categoryTotals[cat] || 0;
                const percent = totalDebitAllTime > 0 ? (amount / totalDebitAllTime) * 100 : 0;
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Others"];
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors.bar}`} />
                        {cat}
                      </span>
                      <span className="font-extrabold text-stone-900">
                        ₹{amount.toLocaleString("en-IN")} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalDebitAllTime === 0 && (
                <p className="text-center text-xs text-stone-400 py-6 font-semibold">
                  No debit records tracked yet.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Ledger transactions table */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Table Controls (Search, Category selection, Sorting) */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
            
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-300 transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-auto relative shrink-0">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-750 focus:outline-none focus:border-orange-300 transition-colors cursor-pointer appearance-none"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4.5 h-4.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="w-full md:w-auto relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full md:w-auto pl-3 pr-8 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-750 focus:outline-none focus:border-orange-300 transition-colors cursor-pointer appearance-none"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
              <ChevronDown className="w-4.5 h-4.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

          </div>

          {/* Ledger Table Box */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200/80 text-[10px] font-bold text-stone-400 uppercase tracking-widest select-none">
                    <th className="px-5 py-3">Tx Details</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Loc & Qty</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredExpenses.map((exp) => {
                    const colors = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["Others"];
                    return (
                      <tr key={exp.id} className="hover:bg-stone-50/55 transition-colors">
                        
                        {/* Details */}
                        <td className="px-5 py-4 min-w-[180px]">
                          <p className="font-extrabold text-stone-900">{exp.description}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold mt-1">
                            <Calendar className="w-3 h-3 text-stone-300" />
                            {exp.date}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-stone-200/30 ${colors.bg} ${colors.text}`}>
                            {exp.category}
                          </span>
                        </td>

                        {/* Location / Qty */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            {exp.location && exp.location !== "?" && (
                              <p className="text-stone-500 font-medium flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-300" />
                                {exp.location}
                              </p>
                            )}
                            {exp.quantity && exp.quantity !== "?" && (
                              <p className="text-[10px] text-stone-400 font-bold">
                                Qty: {exp.quantity}
                              </p>
                            )}
                            {(!exp.location || exp.location === "?") && (!exp.quantity || exp.quantity === "?") && (
                              <span className="text-stone-300">-</span>
                            )}
                          </div>
                        </td>

                        {/* Payment */}
                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-stone-600">
                          {exp.paymentMode}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span className={`text-sm font-extrabold ${
                            exp.type === "DEBIT" ? "text-red-600" : "text-emerald-600"
                          }`}>
                            {exp.type === "DEBIT" ? "-" : "+"}₹{exp.amount.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingExpense(exp)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-stone-400 font-semibold bg-[#fffcf9]/30">
                        No transactions match the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Voice Capturing AI overlay modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-extrabold text-stone-950 uppercase tracking-widest">
                  AI Voice Processor
                </span>
              </div>
              <button
                onClick={() => {
                  stopRecording();
                  setShowVoiceModal(false);
                }}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Recording pulse visualizer */}
            <div className="py-12 flex flex-col items-center justify-center">
              
              {isRecording ? (
                <>
                  <div className="relative">
                    {/* Ring animations */}
                    <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
                    <button
                      onClick={stopRecording}
                      className="relative w-20 h-20 rounded-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      <Square className="w-6 h-6 fill-white stroke-white" />
                    </button>
                  </div>
                  <p className="text-sm font-extrabold text-orange-600 mt-6 animate-pulse">
                    LISTENING... {recordingTime}s
                  </p>
                  <p className="text-xs text-stone-400 font-medium mt-1">
                    Click the red square to stop and analyze.
                  </p>
                </>
              ) : isProcessing ? (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-orange-100 border-t-orange-600 animate-spin" />
                  <p className="text-sm font-extrabold text-stone-700 mt-6">
                    Analyzing details...
                  </p>
                  <p className="text-xs text-stone-400 font-medium mt-1 px-4 text-center">
                    Using Whisper and your custom LLM engine to capture amounts, quantities, and locations.
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-bold text-stone-500">
                    Failed to record or process audio.
                  </p>
                  <button
                    onClick={startRecording}
                    className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-extrabold text-stone-750"
                  >
                    Try Again
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Expense Verification / Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <span className="text-sm font-extrabold text-stone-950 uppercase tracking-widest">
                {editingExpense.id ? "Edit Transaction" : "Verify AI Voice Extract"}
              </span>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-50"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Transcript review if voice extract */}
            {!editingExpense.id && rawTranscript && (
              <div className="mt-4 bg-orange-50/50 border border-orange-200/50 rounded-2xl p-4.5 text-xs text-stone-750 font-medium italic">
                <span className="font-extrabold uppercase text-[9px] text-orange-600 block not-italic tracking-widest mb-1.5">
                  Spoken Dictation Transcript:
                </span>
                "{rawTranscript}"
              </div>
            )}

            <div className="mt-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Type Selection */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Tx Type
                  </label>
                  <select
                    value={editingExpense.type}
                    onChange={(e) => setEditingExpense({ ...editingExpense, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="DEBIT">Debit (Spent)</option>
                    <option value="CREDIT">Credit (Received)</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingExpense.amount || ""}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-extrabold focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingExpense.description || ""}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  placeholder="e.g. Potato"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={editingExpense.category}
                    onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={editingExpense.paymentMode}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={editingExpense.quantity || ""}
                    onChange={(e) => setEditingExpense({ ...editingExpense, quantity: e.target.value })}
                    placeholder="?"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editingExpense.location || ""}
                    onChange={(e) => setEditingExpense({ ...editingExpense, location: e.target.value })}
                    placeholder="?"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editingExpense.date || ""}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditingExpense(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEditOrVoice}
                disabled={isSavingEdit}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm hover:shadow transition-colors flex items-center justify-center gap-1"
              >
                {isSavingEdit ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{editingExpense.id ? "Save Changes" : "Confirm & Save"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
