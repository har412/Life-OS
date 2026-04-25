"use client";
import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, AlertTriangle, CheckCircle2, ChevronDown, Check, GripVertical, Trash2, Settings, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useView } from "@/lib/viewContext";
import { type SortField, PRESET_SAVED_VIEWS } from "@/lib/taskData";
import FilterBar from "@/components/FilterBar";
import WeekView from "@/components/views/WeekView";
import TableView from "@/components/views/TableView";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import AddTaskModal from "@/components/AddTaskModal";
import LandingPage from "@/components/LandingPage";

const KanbanView = dynamic(() => import("@/components/views/KanbanView"), { ssr: false });

function matchDate(d: string | null, preset: string | null, from: string | null, to: string | null): boolean {
  if (!preset && !from && !to) return true;
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const weekEnd  = new Date(today); weekEnd.setDate(today.getDate()+7);
  const nextStart= new Date(today); nextStart.setDate(today.getDate()+7);
  const nextEnd  = new Date(today); nextEnd.setDate(today.getDate()+14);
  if (preset === "no_date") return !d;
  if (!d) return false;
  const dt = new Date(d); dt.setHours(0,0,0,0);
  switch (preset) {
    case "today":     return dt.getTime() === today.getTime();
    case "tomorrow":  return dt.getTime() === tomorrow.getTime();
    case "this_week": return dt >= today && dt <= weekEnd;
    case "next_week": return dt >= nextStart && dt <= nextEnd;
    case "overdue":   return dt < today;
    case "custom": {
      if (from && dt < new Date(from)) return false;
      if (to   && dt > new Date(to))   return false;
      return true;
    }
    default: return true;
  }
}

function ProgressStrip({ total, done, overdue }: { total:number; done:number; overdue:number }) {
  const pct     = total ? Math.round(done / total * 100) : 0;
  const todayStr= new Date().toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" });
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 lg:px-0">
      <div className="lg:hidden relative w-10 h-10 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#F5F5F4" strokeWidth="3.5"/>
          <circle cx="18" cy="18" r="14" fill="none" stroke="#F97316" strokeWidth="3.5"
            strokeDasharray={`${pct * 0.879} 100`} strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle2 className={`w-3.5 h-3.5 ${pct===100?"text-orange-500":"text-stone-300"}`} strokeWidth={2}/>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="lg:hidden">
          <p className="text-xs text-stone-400 font-medium">{todayStr}</p>
          <p className="text-sm font-bold text-stone-900 leading-tight">{pct}% · {done}/{total} done{overdue>0?<span className="text-red-500 font-semibold"> · ⚠️ {overdue} overdue</span>:""}</p>
        </div>
        <div className="hidden lg:flex items-center gap-5 text-sm flex-wrap">
          <span className="text-stone-500"><span className="font-bold text-stone-900">{total}</span> tasks</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"/><span className="font-semibold text-emerald-700">{done}</span><span className="text-stone-400">done</span></span>
          {overdue>0 && <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-400"/><span className="font-semibold text-red-600">{overdue}</span><span className="text-stone-400">overdue</span></span>}
          <div className="flex items-center gap-2 ml-1">
            <div className="w-28 h-1.5 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all" style={{ width:`${pct}%` }}/>
            </div>
            <span className="text-xs text-stone-400 font-medium">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { status } = useSession();

  if (status === "unauthenticated") {
    return <LandingPage />;
  }

  return <Dashboard />;
}

function Dashboard() {
  const { tasks, filters, updateFilter, activeViewId, savedViews, taskCategoryMap, taskStatusMap, loadView, resetFilters, activeTaskId, reorderViews, deleteView } = useView();
  const [search, setSearch] = useState("");
  const [mobileViewsOpen, setMobileViewsOpen] = useState(false);
  const [showDesktopAdd, setShowDesktopAdd] = useState(false);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(savedViews);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderViews(items.map(v => v.id));
  };

  const activeView = savedViews.find(v => v.id === activeViewId);
  const pageTitle  = activeView ? `${activeView.emoji} ${activeView.name}` : "Tasks";

  const mappedTasks = useMemo(() => tasks.map(t => ({
    ...t,
    category: (taskCategoryMap[t.id] ?? t.category) as any,
    status: (taskStatusMap[t.id] ?? t.status) as any,
  })), [tasks, taskCategoryMap, taskStatusMap]);

  const filtered = useMemo(() => mappedTasks.filter(t => {
    if (filters.categories.length > 0 && !filters.categories.includes(t.category)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
    if (filters.statuses.length   > 0 && !filters.statuses.includes(t.status))    return false;
    if (!matchDate(t.dueDate, filters.datePreset, filters.dateFrom, filters.dateTo)) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [mappedTasks, filters, search]);

  const today   = new Date(); today.setHours(0,0,0,0);
  const done    = filtered.filter(t => t.status === "DONE").length;
  const overdue = filtered.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== "DONE" && t.status !== "CANCELLED").length;

  function handleSort(f: SortField) {
    updateFilter("sortBy", f);
    updateFilter("sortDir", filters.sortBy === f ? (filters.sortDir === "asc" ? "desc" : "asc") : "asc");
  }

  const needsFullHeight = filters.viewType === "week" || filters.viewType === "kanban";

  return (
    <div className={`bg-[#fffcf9] flex flex-col ${needsFullHeight ? "h-[calc(100dvh-0px)] lg:h-screen overflow-hidden" : "min-h-screen"}`}>

      {/* Mobile sticky header */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-orange-100 shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 relative">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M5 12l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <button onClick={() => setMobileViewsOpen(o => !o)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
              <p className="text-base font-bold text-stone-900 truncate">{pageTitle}</p>
              <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${mobileViewsOpen ? "rotate-180" : ""}`}/>
            </button>
            {mobileViewsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileViewsOpen(false)}/>
                <div className="absolute top-full left-0 mt-3 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 py-2 flex flex-col max-h-[60vh] overflow-hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-4 py-2 border-b border-stone-50">Views</p>
                  <div className="flex-1 overflow-y-auto">
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="mobile-views-list">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            {savedViews.map((v, index) => {
                              const isPreset = PRESET_SAVED_VIEWS.some(p => p.id === v.id);
                              return (
                                <Draggable key={v.id} draggableId={v.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} className={`flex items-center gap-1 px-2 py-0.5 transition-colors ${activeViewId === v.id ? "bg-orange-50" : snapshot.isDragging ? "bg-stone-50" : ""}`}>
                                      <div {...provided.dragHandleProps} className="p-2 text-stone-300 shrink-0"><GripVertical className="w-4 h-4"/></div>
                                      <button onClick={() => { loadView(v); setMobileViewsOpen(false); }} className="flex-1 flex items-center gap-2.5 py-2.5 text-sm font-medium text-left min-w-0">
                                        <span className="w-5 text-center text-base shrink-0">{v.emoji}</span>
                                        <span className={`flex-1 truncate ${activeViewId === v.id ? "text-orange-700" : "text-stone-700"}`}>{v.name}</span>
                                      </button>
                                      <div className="flex items-center gap-1 pr-2 shrink-0">
                                        {activeViewId === v.id && <Check className="w-4 h-4 text-orange-500"/>}
                                        {!isPreset && <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete view "${v.name}"?`)) deleteView(v.id); }} className="p-2 text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors shrink-0"><Settings className="w-4 h-4"/></Link>
            <button onClick={() => signOut()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0" title="Sign out"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden`}>
        <div className={`max-w-[1440px] w-full mx-auto px-4 lg:px-8 flex flex-col flex-1 overflow-hidden ${needsFullHeight ? "" : "overflow-y-auto"}`}>
          {/* Desktop title row */}
          <div className="hidden lg:flex items-center justify-between py-5 shrink-0">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{pageTitle}</h1>
              <ProgressStrip total={filtered.length} done={done} overdue={overdue}/>
            </div>
            <button 
              onClick={() => setShowDesktopAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[1.25rem] bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white text-sm font-bold shadow-xl shadow-orange-100 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Add Task
            </button>
          </div>

          {/* Mobile progress strip */}
          <div className="lg:hidden shrink-0 bg-white border border-stone-200 rounded-2xl mx-0 mt-3 shadow-sm">
            <ProgressStrip total={filtered.length} done={done} overdue={overdue}/>
            <div className="px-4 pb-3">
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all" style={{ width:`${filtered.length ? Math.round(done/filtered.length*100) : 0}%` }}/>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="bg-white border border-stone-200 rounded-xl px-3 lg:px-4 py-3 shadow-sm mt-3 shrink-0">
            <FilterBar search={search} setSearch={setSearch}/>
          </div>

          {/* View content */}
          <div className={`mt-3 ${needsFullHeight ? "flex-1 overflow-hidden" : "pb-24"}`}>
            {filters.viewType === "kanban" ? (
              <div className="h-full overflow-auto"><KanbanView tasks={filtered}/></div>
            ) : filters.viewType === "week" ? (
              <div className="h-full"><WeekView tasks={filtered}/></div>
            ) : (
              <TableView tasks={filtered} sortBy={filters.sortBy} sortDir={filters.sortDir} onSort={handleSort} groupBy={filters.groupBy}/>
            )}
          </div>
        </div>
      </div>

      {showDesktopAdd && <AddTaskModal onClose={() => setShowDesktopAdd(false)} />}
      {activeTaskId && <TaskDetailsModal taskId={activeTaskId} />}
    </div>
  );
}
