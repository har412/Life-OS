"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import { useView } from "@/lib/viewContext";
import AddTaskModal from "@/components/AddTaskModal";

const today = new Date();

function getWeekDays() {
  const dow = today.getDay(); // 0=Sun
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return {
      short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      date: d,
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

const weekDays = getWeekDays();
const todayIdx = weekDays.findIndex(d => d.isToday);

export default function WeekPage() {
  const { tasks } = useView();
  const [sel, setSel] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [showAdd, setShowAdd] = useState(false);
  const selected = weekDays[sel];

  // Calculate counts for each day
  const counts = weekDays.map(d => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const td = new Date(t.dueDate);
      return td.toDateString() === d.date.toDateString();
    }).length;
  });

  // Filter tasks for the selected day
  const filteredTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const td = new Date(t.dueDate);
    return td.toDateString() === selected.date.toDateString();
  });

  const totalThisWeek = counts.reduce((a, b) => a + b, 0);
  const doneThisWeek = tasks.filter(t => {
    if (!t.dueDate) return false;
    const td = new Date(t.dueDate);
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    return td >= start && td <= end && t.status === "DONE";
  }).length;

  const progress = totalThisWeek > 0 ? Math.round((doneThisWeek / totalThisWeek) * 100) : 0;

  const startStr = weekDays[0].date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const endStr = weekDays[6].date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-1">Week of {startStr} – {endStr}</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">This Week</h1>
        </div>

        {/* Day strip */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2 mb-5 grid grid-cols-7 gap-1">
          {weekDays.map((d, i) => (
            <button
              key={d.short}
              onClick={() => setSel(i)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${sel === i
                ? d.isToday ? "bg-violet-600" : "bg-slate-100"
                : "hover:bg-slate-50"
                }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${sel === i && d.isToday ? "text-violet-200" : "text-slate-400"
                }`}>{d.short}</span>
              <span className={`text-lg font-bold ${sel === i && d.isToday ? "text-white" : sel === i ? "text-slate-800" : "text-slate-600"
                }`}>{d.date.getDate()}</span>
              {counts[i] > 0
                ? <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sel === i && d.isToday ? "bg-violet-500 text-white" : "bg-violet-50 text-violet-600"
                  }`}>{counts[i]}</span>
                : <span className="h-4" />
              }
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm font-medium text-slate-500 shrink-0">Week progress</p>
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm font-semibold text-slate-900 shrink-0">{doneThisWeek} / {totalThisWeek}</p>
          <p className="text-xs text-slate-400 shrink-0">{progress}%</p>
        </div>

        {/* Day header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {selected.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              {counts[sel]} tasks
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(t => <TaskCard key={t.id} task={t} />)
          ) : (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
              <p className="text-sm text-slate-400">No tasks scheduled for this day.</p>
            </div>
          )}
        </div>
        <div className="h-20" />
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
