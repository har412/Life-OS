"use client";
import { Plus } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";

const catStyle: Record<string, { stripe: string; badge: string; text: string }> = {
  WORK:      { stripe:"bg-blue-500",    badge:"bg-blue-50",    text:"text-blue-700" },
  HEALTH:    { stripe:"bg-emerald-500", badge:"bg-emerald-50", text:"text-emerald-700" },
  HOME:      { stripe:"bg-amber-500",   badge:"bg-amber-50",   text:"text-amber-700" },
  LOAN:      { stripe:"bg-red-500",     badge:"bg-red-50",     text:"text-red-700" },
  FRIENDS:   { stripe:"bg-purple-500",  badge:"bg-purple-50",  text:"text-purple-700" },
  FAMILY:    { stripe:"bg-pink-500",    badge:"bg-pink-50",    text:"text-pink-700" },
  LIFESTYLE: { stripe:"bg-teal-500",    badge:"bg-teal-50",    text:"text-teal-700" },
};

const priDot: Record<string, string> = {
  LOW:"bg-slate-300", MEDIUM:"bg-amber-400", HIGH:"bg-orange-500", URGENT:"bg-red-500",
};

type KTask = { id:string; title:string; category:string; priority:string; time?:string; };

const columns: { id:string; label:string; dot:string; badge:string; count:number; tasks:KTask[] }[] = [
  {
    id:"BACKLOG", label:"Backlog", dot:"bg-slate-400", badge:"bg-slate-100 text-slate-600", count:4,
    tasks:[
      { id:"k1", title:"Fix leaking kitchen tap",       category:"HOME",      priority:"LOW" },
      { id:"k2", title:"Update car insurance",          category:"LOAN",      priority:"MEDIUM" },
      { id:"k3", title:"Plan family trip to Manali",    category:"FAMILY",    priority:"LOW" },
      { id:"k4", title:"Read 'Atomic Habits'",          category:"LIFESTYLE", priority:"LOW" },
    ],
  },
  {
    id:"SCHEDULED", label:"Scheduled", dot:"bg-amber-400", badge:"bg-amber-50 text-amber-700", count:4,
    tasks:[
      { id:"k5", title:"Pay home loan EMI",             category:"LOAN",      priority:"URGENT", time:"Tomorrow 11am" },
      { id:"k6", title:"Doctor appointment",            category:"HEALTH",    priority:"HIGH",   time:"Tue 11am" },
      { id:"k7", title:"Client presentation",           category:"WORK",      priority:"URGENT", time:"Tue 2pm" },
      { id:"k8", title:"Grocery shopping",              category:"LIFESTYLE", priority:"LOW",    time:"Fri evening" },
    ],
  },
  {
    id:"IN_PROGRESS", label:"In Progress", dot:"bg-violet-500", badge:"bg-violet-50 text-violet-700", count:2,
    tasks:[
      { id:"k9",  title:"Q2 financial report review",   category:"WORK",      priority:"HIGH" },
      { id:"k10", title:"Gym membership renewal",       category:"HEALTH",    priority:"MEDIUM" },
    ],
  },
  {
    id:"DONE", label:"Done", dot:"bg-emerald-500", badge:"bg-emerald-50 text-emerald-700", count:3,
    tasks:[
      { id:"k11", title:"Morning jog — 5km",            category:"HEALTH",    priority:"MEDIUM" },
      { id:"k12", title:"Team standup",                 category:"WORK",      priority:"HIGH" },
      { id:"k13", title:"Pay electricity bill",         category:"HOME",      priority:"MEDIUM" },
    ],
  },
];

function KanbanCard({ task, done }: { task: KTask; done?: boolean }) {
  const c = catStyle[task.category] ?? catStyle.LIFESTYLE;
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3.5 cursor-grab hover:shadow-sm transition-all group ${done ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className={`w-1 rounded-full shrink-0 ${c.stripe}`} style={{ height: 32 }} />
        <p className={`text-sm font-medium leading-snug flex-1 ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {task.title}
        </p>
        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${priDot[task.priority]}`} />
      </div>
      {task.time && (
        <p className="text-xs text-slate-400 mb-2">⏰ {task.time}</p>
      )}
      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${c.badge} ${c.text}`}>
        {task.category.charAt(0) + task.category.slice(1).toLowerCase()}
      </span>
    </div>
  );
}

export default function KanbanPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">Drag tasks to update status</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kanban Board</h1>
        </div>
        <div className="flex gap-1.5">
          {["All","Work","Health","Loan","Home"].map((f,i) => (
            <button key={f} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              i === 0
                ? "bg-violet-600 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
            }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-4" style={{ minHeight: "calc(100vh - 168px)" }}>
        {columns.map(col => (
          <div key={col.id} className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Column header */}
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-slate-100">
              <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
              <span className="text-sm font-semibold text-slate-800 flex-1">{col.label}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.badge}`}>{col.count}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {col.tasks.map(t => <KanbanCard key={t.id} task={t} done={col.id === "DONE"} />)}
              <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-dashed border-slate-200 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add task
              </button>
            </div>
          </div>
        ))}
      </div>
      <VoiceInputButton />
    </div>
  );
}
