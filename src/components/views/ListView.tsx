"use client";
import TaskCard from "@/components/TaskCard";
import type { Task } from "@/lib/taskData";
import { formatDate } from "@/lib/taskData";

/* ─── Group tasks by due date for mobile ──────────────────── */
function groupByDate(tasks: Task[]): { label: string; emoji: string; tasks: Task[]; accent: string }[] {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekEnd  = new Date(today); weekEnd.setDate(today.getDate() + 7);

  const groups: Record<string, Task[]> = {
    overdue:   [],
    today:     [],
    tomorrow:  [],
    this_week: [],
    later:     [],
    no_date:   [],
  };

  tasks.forEach(t => {
    if (!t.dueDate) { groups.no_date.push(t); return; }
    const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
    if (d < today)            groups.overdue.push(t);
    else if (d.getTime() === today.getTime())    groups.today.push(t);
    else if (d.getTime() === tomorrow.getTime()) groups.tomorrow.push(t);
    else if (d <= weekEnd)    groups.this_week.push(t);
    else                      groups.later.push(t);
  });

  return [
    { label: "Overdue",   emoji: "⚠️", tasks: groups.overdue,   accent: "text-red-600" },
    { label: "Today",     emoji: "☀️", tasks: groups.today,     accent: "text-orange-600" },
    { label: "Tomorrow",  emoji: "📅", tasks: groups.tomorrow,   accent: "text-amber-600" },
    { label: "This week", emoji: "📆", tasks: groups.this_week,  accent: "text-stone-700" },
    { label: "Later",     emoji: "🗓️", tasks: groups.later,      accent: "text-stone-500" },
    { label: "No date",   emoji: "—",  tasks: groups.no_date,    accent: "text-stone-400" },
  ].filter(g => g.tasks.length > 0);
}

/* ─── Empty state ─────────────────────────────────────────── */
function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-stone-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <p className="text-sm font-semibold text-stone-600 mb-1">No tasks match</p>
      <p className="text-xs text-stone-400">Try adjusting your filters.</p>
    </div>
  );
}

/* ─── ListView ────────────────────────────────────────────── */
export default function ListView({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <Empty />;

  const groups = groupByDate(tasks);

  // Mobile: show grouped by date
  const mobileView = (
    <div className="lg:hidden space-y-5">
      {groups.map(g => (
        <div key={g.label}>
          <div className="flex items-center gap-2 mb-2.5 px-0.5">
            <span className="text-base">{g.emoji}</span>
            <h3 className={`text-sm font-bold ${g.accent}`}>{g.label}</h3>
            <span className="text-xs text-stone-400 font-medium">{g.tasks.length}</span>
            <div className="flex-1 h-px bg-stone-100 ml-1" />
          </div>
          <div className="space-y-2">
            {g.tasks.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      ))}
    </div>
  );

  // Desktop: flat list
  const desktopView = (
    <div className="hidden lg:block space-y-2">
      {tasks.map(t => <TaskCard key={t.id} task={t} />)}
    </div>
  );

  return <>{mobileView}{desktopView}</>;
}
