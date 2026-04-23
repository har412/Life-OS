"use client";
import { useState } from "react";
import { MessageSquare, Image as ImageIcon } from "lucide-react";
import { formatDate, getCatMeta, STATUS_META, PRIORITY_META, type Task } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";

const today = new Date();

function getWeekDays() {
  const dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return {
      label:   ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
      date:    d,
      isToday: d.toDateString() === today.toDateString(),
      iso:     d.toISOString().slice(0, 10),
    };
  });
}

const weekDays = getWeekDays();

function groupByDay(tasks: Task[]) {
  const map: Record<string, Task[]> = {};
  weekDays.forEach(d => { map[d.iso] = []; });
  tasks.forEach(t => {
    if (t.dueDate && map[t.dueDate] !== undefined) map[t.dueDate].push(t);
  });
  return map;
}

/* ─── Mini task chip for desktop ───────────── */
function TaskChip({ task }: { task: Task }) {
  const { allCategories, setActiveTaskId } = useView();
  const cat  = getCatMeta(task.category, allCategories);
  const st   = STATUS_META[task.status];
  const due  = formatDate(task.dueDate);
  const done = task.status === "DONE";

  return (
    <div onClick={() => setActiveTaskId(task.id)} className={`group px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
      done
        ? "bg-stone-50 border-stone-100 opacity-50"
        : due.isOverdue
          ? "bg-red-50 border-red-100 hover:border-red-200"
          : "bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm"
    }`}>
      <div className="flex items-start gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${cat.dot}`}/>
        <p className={`text-xs font-medium leading-tight line-clamp-2 flex-1 ${done ? "line-through text-stone-400" : "text-stone-700"}`}>
          {task.title}
        </p>
      </div>
      {task.time && <p className="text-[10px] text-stone-400 mt-1 pl-3">⏰ {task.time}</p>}
      <div className="flex items-center gap-1 mt-1.5 pl-3">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${st.badge} ${st.text}`}>{st.label}</span>
        {task.images && task.images.length > 0 && <span className="text-[10px] font-medium text-stone-400 flex items-center gap-0.5 ml-1"><ImageIcon className="w-2.5 h-2.5"/> {task.images.length}</span>}
        {task.comments && task.comments.length > 0 && <span className="text-[10px] font-medium text-stone-400 flex items-center gap-0.5 ml-1"><MessageSquare className="w-2.5 h-2.5"/> {task.comments.length}</span>}
      </div>
    </div>
  );
}

export default function WeekView({ tasks }: { tasks: Task[] }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const grouped = groupByDay(tasks);

  // Mobile: show day strip + tasks for selected day
  const mobileView = (
    <div className="lg:hidden flex flex-col h-full">
      {/* Day strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
        {weekDays.map(day => {
          const count   = grouped[day.iso]?.length ?? 0;
          const isActive = selectedDay ? selectedDay === day.iso : day.isToday;
          return (
            <button
              key={day.iso}
              onClick={() => setSelectedDay(day.iso)}
              className={`flex flex-col items-center gap-0.5 px-3.5 py-2.5 rounded-xl shrink-0 transition-all ${
                isActive ? "bg-orange-500 shadow-sm shadow-orange-200" : count > 0 ? "bg-white border border-stone-200" : "bg-stone-100"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${isActive ? "text-orange-200" : "text-stone-400"}`}>{day.label}</span>
              <span className={`text-xl font-bold ${isActive ? "text-white" : "text-stone-700"}`}>{day.date.getDate()}</span>
              {count > 0
                ? <span className={`text-[10px] font-bold ${isActive ? "text-orange-200" : "text-orange-500"}`}>{count}</span>
                : <span className="text-[10px] text-transparent">·</span>}
            </button>
          );
        })}
      </div>

      {/* Tasks for selected day */}
      {(() => {
        const iso      = selectedDay ?? weekDays.find(d => d.isToday)?.iso ?? weekDays[0].iso;
        const dayTasks = grouped[iso] ?? [];
        const dayLabel = weekDays.find(d => d.iso === iso);
        return (
          <div className="flex-1 overflow-y-auto mt-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-stone-800">
                {dayLabel?.isToday ? "Today" : dayLabel?.label}
              </span>
              <span className="text-xs text-stone-400">
                {dayLabel?.date.toLocaleDateString("en-IN", { day:"numeric", month:"long" })}
              </span>
              {dayTasks.length > 0 && <span className="text-xs text-orange-600 font-semibold ml-auto">{dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}</span>}
            </div>
            {dayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl mb-2">✨</span>
                <p className="text-sm text-stone-500 font-medium">Nothing scheduled</p>
                <p className="text-xs text-stone-400 mt-0.5">This day is free!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayTasks.map(t => {
                  const { allCategories } = { allCategories: [] }; // placeholder
                  return <MobileTaskRow key={t.id} task={t} />;
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  // Desktop: 7 full-height columns
  const desktopView = (
    <div className="hidden lg:grid lg:grid-cols-7 gap-3 h-full">
      {weekDays.map(day => {
        const dayTasks = grouped[day.iso] ?? [];
        const isEmpty  = dayTasks.length === 0;
        return (
          <div key={day.iso}
            className={`flex flex-col rounded-2xl border overflow-hidden ${
              day.isToday ? "border-orange-200 bg-orange-50/30" : "border-stone-200 bg-white"
            }`}
          >
            {/* Day header */}
            <div className={`px-3 py-3 border-b shrink-0 ${day.isToday ? "border-orange-200 bg-orange-50" : "border-stone-100"}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${day.isToday ? "text-orange-500" : "text-stone-400"}`}>
                  {day.label}
                </p>
                {dayTasks.length > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${day.isToday ? "bg-orange-100 text-orange-600" : "bg-stone-100 text-stone-500"}`}>
                    {dayTasks.length}
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold leading-tight mt-0.5 ${day.isToday ? "text-orange-600" : "text-stone-700"}`}>
                {day.date.getDate()}
              </p>
            </div>

            {/* Tasks — scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {dayTasks.map(t => <TaskChip key={t.id} task={t}/>)}
              {isEmpty && (
                <div className="flex items-center justify-center h-full min-h-[60px]">
                  <p className="text-[10px] text-stone-300 font-medium">Free</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return <>{mobileView}{desktopView}</>;
}

/* Inline to avoid circular import */
function MobileTaskRow({ task }: { task: Task }) {
  const { allCategories, setActiveTaskId } = useView();
  const cat  = getCatMeta(task.category, allCategories);
  const st   = STATUS_META[task.status];
  const due  = formatDate(task.dueDate);
  const done = task.status === "DONE";

  return (
    <div onClick={() => setActiveTaskId(task.id)} className={`flex items-start gap-3 bg-white border border-stone-200 rounded-xl p-3.5 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer ${done ? "opacity-55" : ""}`}>
      <div className={`w-1 rounded-full shrink-0 ${cat.dot}`} style={{ height:28 }}/>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "line-through text-stone-400" : "text-stone-800"}`}>{task.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.badge} ${st.text}`}>{st.label}</span>
          <span className={`text-xs font-medium flex items-center gap-1 ${cat.text}`}><span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}/>{cat.label}</span>
          {task.time && <span className="text-xs text-stone-400">⏰ {task.time}</span>}
          {task.images && task.images.length > 0 && <span className="text-xs font-medium text-stone-400 flex items-center gap-1 ml-1"><ImageIcon className="w-3 h-3"/> {task.images.length}</span>}
          {task.comments && task.comments.length > 0 && <span className="text-xs font-medium text-stone-400 flex items-center gap-1 ml-1"><MessageSquare className="w-3 h-3"/> {task.comments.length}</span>}
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${PRIORITY_META[task.priority].dot}`}/>
    </div>
  );
}
