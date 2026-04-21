"use client";
import { useState } from "react";
import VoiceInputButton from "@/components/VoiceInputButton";
import TaskCard from "@/components/TaskCard";
import AddTaskModal from "@/components/AddTaskModal";

const todayTasks = [
  { id: "1", title: "Review Q2 financial report", category: "WORK", priority: "HIGH", status: "IN_PROGRESS", time: "10:00 AM", tags: ["finance", "q2"] },
  { id: "2", title: "Pay EMI for home loan", category: "LOAN", priority: "URGENT", status: "SCHEDULED", time: "11:00 AM", tags: ["payment"] },
  { id: "3", title: "Morning jog — 5km", category: "HEALTH", priority: "MEDIUM", status: "DONE", time: "7:00 AM", tags: ["exercise"] },
  { id: "4", title: "Call mom and check on her", category: "FAMILY", priority: "MEDIUM", status: "SCHEDULED", time: "6:00 PM", tags: [] },
  { id: "5", title: "Fix leaking kitchen tap", category: "HOME", priority: "LOW", status: "BACKLOG", time: null, tags: ["repair"] },
];

const stats = [
  { label: "Done Today", value: "3", icon: "✅", color: "#22c55e" },
  { label: "Remaining", value: "4", icon: "⏳", color: "#f97316" },
  { label: "This Week", value: "18", icon: "📅", color: "#6366f1" },
  { label: "In Backlog", value: "24", icon: "📋", color: "#a855f7" },
];

export default function TodayPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>{dateStr}</div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Good Morning, Harkirat 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            You have <span className="font-semibold" style={{ color: "#f97316" }}>4 tasks</span> left for today
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.3)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick AI Summary Banner */}
      <div className="rounded-2xl p-4 mb-8 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.08))", border: "1px solid rgba(99,102,241,0.25)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(99,102,241,0.2)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.8} className="w-5 h-5">
            <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 8v4l3 3" /><path d="M18 2l4 4-4 4M22 6H18" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold mb-0.5" style={{ color: "#a78bfa" }}>AI Insight</div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            You've been rescheduling health tasks 3 weeks in a row. Try blocking 7–8 AM daily for your jog — you completed it today! 🎉
          </div>
        </div>
        <button className="text-xs px-3 py-1.5 rounded-lg shrink-0" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
          View Full Summary
        </button>
      </div>

      {/* Task List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Today's Tasks</h2>
        <div className="flex gap-2">
          {["All", "Work", "Health", "Loan", "Family"].map((f) => (
            <button key={f} className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{ background: f === "All" ? "var(--accent)" : "var(--bg-elevated)", color: f === "All" ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {todayTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Voice Button */}
      <VoiceInputButton />
      {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
