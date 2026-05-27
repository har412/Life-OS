"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useView } from "@/lib/viewContext";
import { createExpense } from "@/app/actions/expenses";
import {
  Mic,
  Square,
  Sparkles,
  X,
  Check,
  Loader2,
  Calendar,
  Clock,
  TrendingDown,
  Plus,
  Layers,
  ArrowRight,
  MapPin,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { type Priority } from "@/lib/taskData";

const PRIS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Investment",
  "Others"
];

export default function GlobalVoiceFAB() {
  const { status: authStatus } = useSession();
  const { allCategories, addTask } = useView();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"task" | "expense">("task");

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [rawTranscript, setRawTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Verification verification states
  const [verifiedTask, setVerifiedTask] = useState<{
    title: string;
    description: string;
    categoryId: string;
    priority: Priority;
    dueDate: string;
    time: string;
  } | null>(null);

  const [verifiedExpense, setVerifiedExpense] = useState<{
    amount: number;
    description: string;
    category: string;
    date: string;
    quantity: string;
    location: string;
    type: string;
    paymentMode: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

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

  // Clean form states when opening
  const handleOpen = () => {
    setVerifiedTask(null);
    setVerifiedExpense(null);
    setRawTranscript("");
    setIsRecording(false);
    setIsProcessing(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    stopRecording();
    setIsOpen(false);
  };

  const startRecording = async () => {
    try {
      setVerifiedTask(null);
      setVerifiedExpense(null);
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
        processAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
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

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob);

      const endpoint = mode === "task" ? "/api/ai/process" : "/api/ai/process-expense";
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Error processing voice command");
      }

      const resData = await response.json();
      setRawTranscript(resData.transcript);

      if (mode === "task") {
        if (resData.tasks && resData.tasks.length > 0) {
          const raw = resData.tasks[0];
          setVerifiedTask({
            title: raw.title || "Voice Task",
            description: raw.description || "",
            categoryId: raw.categoryId || allCategories[0]?.id || "WORK",
            priority: raw.priority || "MEDIUM",
            dueDate: raw.dueDate || "",
            time: raw.time || "",
          });
        } else {
          toast.error("Could not parse task. Setting manual default.");
          setVerifiedTask({
            title: "Voice Task Entry",
            description: "",
            categoryId: allCategories[0]?.id || "WORK",
            priority: "MEDIUM",
            dueDate: "",
            time: "",
          });
        }
      } else {
        if (resData.expense) {
          const raw = resData.expense;
          setVerifiedExpense({
            amount: raw.amount || 0,
            description: raw.description || "Voice Expense",
            category: raw.category || "Others",
            date: raw.date || new Date().toISOString().split("T")[0],
            quantity: raw.quantity || "?",
            location: raw.location || "?",
            type: raw.type || "DEBIT",
            paymentMode: raw.paymentMode || "CASH",
          });
        } else {
          toast.error("Could not parse expense parameters.");
          setVerifiedExpense({
            amount: 0,
            description: "Voice Expense Entry",
            category: "Others",
            date: new Date().toISOString().split("T")[0],
            quantity: "?",
            location: "?",
            type: "DEBIT",
            paymentMode: "CASH",
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze voice data");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveConfirmed = async () => {
    setIsSaving(true);
    try {
      if (mode === "task" && verifiedTask) {
        if (!verifiedTask.title.trim()) {
          toast.error("Title is required");
          setIsSaving(false);
          return;
        }

        await addTask({
          title: verifiedTask.title,
          description: verifiedTask.description,
          category: verifiedTask.categoryId,
          priority: verifiedTask.priority,
          dueDate: verifiedTask.dueDate || null,
          time: verifiedTask.time || null,
        });

        toast.success("AI Task created successfully!");
        setIsOpen(false);
      } else if (mode === "expense" && verifiedExpense) {
        if (verifiedExpense.amount <= 0) {
          toast.error("Please enter a valid amount");
          setIsSaving(false);
          return;
        }
        if (!verifiedExpense.description.trim()) {
          toast.error("Description is required");
          setIsSaving(false);
          return;
        }

        const res = await createExpense({
          amount: verifiedExpense.amount,
          description: verifiedExpense.description,
          category: verifiedExpense.category,
          date: verifiedExpense.date,
          quantity: verifiedExpense.quantity || "?",
          location: verifiedExpense.location || "?",
          type: verifiedExpense.type,
          paymentMode: verifiedExpense.paymentMode,
          metadata: { transcript: rawTranscript, source: "global-voice" }
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("AI Expense logged successfully!");
          // Trigger global route update if on expenses route
          if (window.location.pathname === "/expenses") {
            window.location.reload();
          }
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to commit AI entry.");
    } finally {
      setIsSaving(false);
    }
  };

  // Only render FAB for active authenticated users
  if (authStatus !== "authenticated") return null;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6">
        <button
          onClick={handleOpen}
          className="w-14 h-14 rounded-full flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/20 border border-orange-500/30 hover:scale-105 active:scale-95 transition-all group pointer-events-auto"
          title="Ask AI Assistant"
        >
          <Mic className="w-6 h-6 group-hover:animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-[8px] font-extrabold items-center justify-center text-white">
              AI
            </span>
          </span>
        </button>
      </div>

      {/* Global AI Assistant Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          <div className="absolute inset-0" onClick={handleClose} />
          
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-stone-100 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-extrabold text-stone-950 uppercase tracking-widest">
                  Life OS AI Copilot
                </span>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Segmented Mode Selector (Task vs Expense) */}
            {!isRecording && !isProcessing && !verifiedTask && !verifiedExpense && (
              <div className="px-6 pt-4 pb-2 shrink-0">
                <div className="flex p-1 bg-stone-50 rounded-xl border border-stone-100">
                  <button
                    onClick={() => setMode("task")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === "task"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Task AI
                  </button>
                  <button
                    onClick={() => setMode("expense")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === "expense"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    Expense AI
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Dictation Screen */}
              {!verifiedTask && !verifiedExpense && (
                <div className="flex flex-col items-center justify-center py-8 text-center min-h-[220px]">
                  
                  {isRecording ? (
                    <>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
                        <button
                          onClick={stopRecording}
                          aria-label="Stop Recording"
                          className="relative w-20 h-20 rounded-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
                        >
                          <Square className="w-6 h-6 fill-white stroke-white" />
                        </button>
                      </div>
                      <h3 className="text-lg font-bold text-orange-600 animate-pulse">
                        Listening... {recordingTime}s
                      </h3>
                      <p className="text-xs text-stone-400 mt-1 font-semibold">
                        Speak details naturally and press the red box to analyze!
                      </p>
                    </>
                  ) : isProcessing ? (
                    <>
                      <div className="relative mb-6">
                        <div className="w-16 h-16 border-4 border-orange-50 rounded-full" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-orange-500 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-bold text-stone-750">Processing Audio...</h3>
                      <p className="text-xs text-stone-400 mt-1 px-4">
                        Whisper is transcribing and the AI is matching details...
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startRecording}
                        aria-label="Start Recording"
                        className="w-20 h-20 rounded-3xl bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-600 transition-all duration-300 shadow-sm hover:shadow-md mb-6 hover:scale-105 active:scale-95"
                      >
                        <Mic className="w-9 h-9" />
                      </button>
                      <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                        {mode === "task" ? "Create Task via Voice" : "Log Expense via Voice"}
                      </h3>
                      <p className="mt-2 text-xs text-stone-400 max-w-[260px] mx-auto leading-relaxed font-semibold">
                        {mode === "task" 
                          ? "E.g., 'Draft marketing proposal by tomorrow afternoon at high priority'"
                          : "E.g., 'I bought fifty rupees potato from DMart today via cash'"}
                      </p>
                    </>
                  )}

                </div>
              )}

              {/* Task Verification Form */}
              {verifiedTask && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4.5 text-xs text-stone-700 italic">
                    <span className="font-extrabold uppercase text-[9px] text-orange-600 block not-italic tracking-wider mb-1">
                      Voice Transcript:
                    </span>
                    "{rawTranscript || "Empty entry"}"
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={verifiedTask.title}
                      onChange={(e) => setVerifiedTask({ ...verifiedTask, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                      Description
                    </label>
                    <textarea
                      value={verifiedTask.description}
                      onChange={(e) => setVerifiedTask({ ...verifiedTask, description: e.target.value })}
                      placeholder="Add details..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Category
                      </label>
                      <select
                        value={verifiedTask.categoryId}
                        onChange={(e) => setVerifiedTask({ ...verifiedTask, categoryId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Priority
                      </label>
                      <select
                        value={verifiedTask.priority}
                        onChange={(e) => setVerifiedTask({ ...verifiedTask, priority: e.target.value as Priority })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      >
                        {PRIS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={verifiedTask.dueDate}
                        onChange={(e) => setVerifiedTask({ ...verifiedTask, dueDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={verifiedTask.time}
                        onChange={(e) => setVerifiedTask({ ...verifiedTask, time: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Expense Verification Form */}
              {verifiedExpense && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4.5 text-xs text-stone-700 italic">
                    <span className="font-extrabold uppercase text-[9px] text-orange-600 block not-italic tracking-wider mb-1">
                      Voice Transcript:
                    </span>
                    "{rawTranscript || "Empty entry"}"
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Type
                      </label>
                      <select
                        value={verifiedExpense.type}
                        onChange={(e) => setVerifiedExpense({ ...verifiedExpense, type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      >
                        <option value="DEBIT">Debit (Spent)</option>
                        <option value="CREDIT">Credit (Received)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={verifiedExpense.amount || ""}
                        onChange={(e) => setVerifiedExpense({ ...verifiedExpense, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-extrabold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={verifiedExpense.description}
                      onChange={(e) => setVerifiedExpense({ ...verifiedExpense, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Category
                      </label>
                      <select
                        value={verifiedExpense.category}
                        onChange={(e) => setVerifiedExpense({ ...verifiedExpense, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={verifiedExpense.paymentMode}
                        onChange={(e) => setVerifiedExpense({ ...verifiedExpense, paymentMode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Quantity
                      </label>
                      <input
                        type="text"
                        value={verifiedExpense.quantity}
                        onChange={(e) => setVerifiedExpense({ ...verifiedExpense, quantity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={verifiedExpense.location}
                        onChange={(e) => setVerifiedExpense({ ...verifiedExpense, location: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                      Transaction Date
                    </label>
                    <input
                      type="date"
                      value={verifiedExpense.date}
                      onChange={(e) => setVerifiedExpense({ ...verifiedExpense, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer with action buttons */}
            {(verifiedTask || verifiedExpense) && (
              <div className="border-t border-stone-100 p-6 flex gap-3 shrink-0">
                <button
                  onClick={() => {
                    setVerifiedTask(null);
                    setVerifiedExpense(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors"
                >
                  Back to Mic
                </button>
                <button
                  onClick={handleSaveConfirmed}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm hover:shadow transition-colors flex items-center justify-center gap-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Save</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
