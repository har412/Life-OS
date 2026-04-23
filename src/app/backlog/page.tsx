"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, CalendarRange } from "lucide-react";
import TaskCard, { type Task } from "@/components/TaskCard";
import VoiceInputButton from "@/components/VoiceInputButton";

const catStyle: Record<string, { dot: string; label: string; badge: string; text: string }> = {
  WORK:      { dot:"bg-blue-500",    label:"Work",      badge:"bg-blue-50",    text:"text-blue-700" },
  HEALTH:    { dot:"bg-emerald-500", label:"Health",    badge:"bg-emerald-50", text:"text-emerald-700" },
  HOME:      { dot:"bg-amber-500",   label:"Home",      badge:"bg-amber-50",   text:"text-amber-700" },
  LOAN:      { dot:"bg-red-500",     label:"Loan",      badge:"bg-red-50",     text:"text-red-700" },
  FRIENDS:   { dot:"bg-purple-500",  label:"Friends",   badge:"bg-purple-50",  text:"text-purple-700" },
  FAMILY:    { dot:"bg-pink-500",    label:"Family",    badge:"bg-pink-50",    text:"text-pink-700" },
  LIFESTYLE: { dot:"bg-teal-500",    label:"Lifestyle", badge:"bg-teal-50",    text:"text-teal-700" },
};

const backlog: { cat: string; tasks: Task[] }[] = [
  { cat:"WORK", tasks:[
    { id:"b1", title:"Prepare Q3 roadmap presentation", category:"WORK", priority:"HIGH",   status:"BACKLOG", tags:["planning"] },
    { id:"b2", title:"Update team confluence docs",      category:"WORK", priority:"LOW",    status:"BACKLOG", tags:["docs"] },
    { id:"b3", title:"Research new deployment pipeline", category:"WORK", priority:"MEDIUM", status:"BACKLOG", tags:["devops"] },
  ]},
  { cat:"LOAN", tasks:[
    { id:"b4", title:"Foreclose personal loan early",   category:"LOAN", priority:"HIGH",   status:"BACKLOG", tags:["finance"] },
    { id:"b5", title:"Car loan refinance check",        category:"LOAN", priority:"MEDIUM", status:"BACKLOG", tags:[] },
    { id:"b6", title:"Review credit card statement",    category:"LOAN", priority:"MEDIUM", status:"BACKLOG", tags:["payment"] },
  ]},
  { cat:"HOME", tasks:[
    { id:"b7", title:"Fix leaking kitchen tap",         category:"HOME", priority:"LOW",    status:"BACKLOG", tags:["repair"] },
    { id:"b8", title:"Deep clean bedroom",              category:"HOME", priority:"LOW",    status:"BACKLOG", tags:[] },
    { id:"b9", title:"Repaint living room wall",        category:"HOME", priority:"LOW",    status:"BACKLOG", tags:[] },
  ]},
  { cat:"HEALTH", tasks:[
    { id:"b10", title:"Book annual health checkup",     category:"HEALTH", priority:"HIGH",   status:"BACKLOG", tags:[] },
    { id:"b11", title:"Start meditation routine",       category:"HEALTH", priority:"MEDIUM", status:"BACKLOG", tags:["mindfulness"] },
  ]},
  { cat:"FAMILY", tasks:[
    { id:"b12", title:"Plan family reunion trip",       category:"FAMILY", priority:"MEDIUM", status:"BACKLOG", tags:["travel"] },
    { id:"b13", title:"Dad's birthday gift shopping",   category:"FAMILY", priority:"HIGH",   status:"BACKLOG", tags:[] },
  ]},
  { cat:"FRIENDS", tasks:[
    { id:"b14", title:"Plan Rahul's farewell dinner",   category:"FRIENDS", priority:"HIGH", status:"BACKLOG", tags:["event"] },
    { id:"b15", title:"Return book to Priya",           category:"FRIENDS", priority:"LOW",  status:"BACKLOG", tags:[] },
  ]},
];

export default function BacklogPage() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch]       = useState("");

  const total = backlog.reduce((a, g) => a + g.tasks.length, 0);
  const toggle = (cat: string) => setCollapsed(c => ({ ...c, [cat]: !c[cat] }));

  const filtered = backlog.map(g => ({
    ...g,
    tasks: g.tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
  })).filter(g => g.tasks.length > 0 || !search);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-slate-400 mb-1">Unscheduled items by category</p>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Backlog</h1>
              <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">{total}</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search backlog…"
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 w-52"
            />
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-3">
          {filtered.map(({ cat, tasks }) => {
            const s = catStyle[cat];
            const open = !collapsed[cat];
            return (
              <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

                {/* Group header */}
                <button
                  onClick={() => toggle(cat)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {open
                    ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-sm font-semibold text-slate-900 flex-1">{s.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge} ${s.text}`}>{tasks.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-lg transition-colors ml-2"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    Schedule All
                  </button>
                </button>

                {/* Tasks */}
                {open && (
                  <div className="px-4 pb-4 space-y-2">
                    {tasks.map(t => <TaskCard key={t.id} task={t} />)}
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-dashed border-slate-200 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Add to {s.label}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-20" />
      </div>
      <VoiceInputButton />
    </div>
  );
}
