"use client";
import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, AlertTriangle, ChevronDown, Check,
  Trash2, Settings, LogOut, SlidersHorizontal, X,
  RotateCcw, BookmarkPlus, RefreshCw, Mic,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useView } from "@/lib/viewContext";
import {
  type SortField, PRESET_SAVED_VIEWS,
  getCatMeta, PRIORITY_META, STATUS_META, type Priority, type Status,
} from "@/lib/taskData";
import FilterBar from "@/components/FilterBar";
import WeekView from "@/components/views/WeekView";
import TableView from "@/components/views/TableView";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import AddTaskModal from "@/components/AddTaskModal";
import LandingPage from "@/components/LandingPage";

const KanbanView = dynamic(() => import("@/components/views/KanbanView"), { ssr: false });

/* ─────────────────────── helpers ─────────────────────── */
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

/* ─────────────────────── SaveViewDialog (mobile bottom-sheet) ─────────────────────── */
function SaveViewSheet({ onSave, onClose }: { onSave: (n: string, e: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📋");
  const emojis = ["📋","💼","🏃","🏦","🏠","❤️","🎯","⚡","🌟","🔥","⚠️","📌"];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-t-3xl w-full max-w-md p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4"/>
        <h3 className="text-base font-bold text-stone-900 mb-4">Save current view</h3>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {emojis.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${emoji===e?"bg-orange-100 ring-2 ring-orange-400":"hover:bg-stone-100"}`}
            >{e}</button>
          ))}
        </div>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="View name…"
          onKeyDown={e => e.key==="Enter" && name.trim() && onSave(name.trim(), emoji)}
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-600">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim(), emoji)} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-sm font-bold text-white transition-colors"
          >Save View</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Mobile filter panel ─────────────────────── */
const ALL_PRIS: Priority[] = ["URGENT","HIGH","MEDIUM","LOW"];
const ALL_STATS: Status[]  = ["BACKLOG","SCHEDULED","IN_PROGRESS","DONE","CANCELLED"];

function MobileFilterPanel({ hasFilters, onClose }: { hasFilters: boolean; onClose: () => void }) {
  const { filters, updateFilter, allCategories, resetFilters, saveCurrentView } = useView();
  const [saveDialog, setSaveDialog] = useState(false);

  const toggle = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  return (
    <div className="space-y-3">
      {/* Status */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATS.map(s => {
            const m = STATUS_META[s];
            const active = filters.statuses.includes(s);
            return (
              <button key={s} onClick={() => updateFilter("statuses", toggle(filters.statuses, s))}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${active ? `${m.badge} ${m.text} border-current shadow-sm` : "bg-white text-stone-500 border-stone-200"}`}
              >{m.label}</button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Priority</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PRIS.map(p => {
            const m = PRIORITY_META[p];
            const active = filters.priorities.includes(p);
            return (
              <button key={p} onClick={() => updateFilter("priorities", toggle(filters.priorities, p))}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${active ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-white text-stone-500 border-stone-200"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`}/>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category */}
      {allCategories.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map(c => {
              const active = filters.categories.includes(c.id);
              return (
                <button key={c.id} onClick={() => updateFilter("categories", toggle(filters.categories, c.id))}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${active ? `${c.badge} ${c.text} border-current shadow-sm` : "bg-white text-stone-500 border-stone-200"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1 border-t border-orange-100">
        <div className="flex gap-2">
          {hasFilters && (
            <button onClick={() => { resetFilters(); onClose(); }}
              className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3"/>Clear filters
            </button>
          )}
        </div>
        <button onClick={() => setSaveDialog(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg"
        >
          <BookmarkPlus className="w-3.5 h-3.5"/>Save view
        </button>
      </div>

      {saveDialog && (
        <SaveViewSheet
          onSave={(n, e) => { saveCurrentView(n, e); setSaveDialog(false); onClose(); }}
          onClose={() => setSaveDialog(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Desktop progress strip ─────────────────────── */
function ProgressStrip({ total, done, overdue }: { total:number; done:number; overdue:number }) {
  const pct = total ? Math.round(done/total*100) : 0;
  return (
    <div className="flex items-center gap-5 text-sm flex-wrap py-1">
      <span className="text-stone-500"><span className="font-bold text-stone-900">{total}</span> tasks</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"/><span className="font-semibold text-emerald-700">{done}</span><span className="text-stone-400">done</span></span>
      {overdue>0 && <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-400"/><span className="font-semibold text-red-600">{overdue}</span><span className="text-stone-400">overdue</span></span>}
      <div className="flex items-center gap-2">
        <div className="w-28 h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all" style={{width:`${pct}%`}}/>
        </div>
        <span className="text-xs text-stone-400 font-medium">{pct}%</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Root page ─────────────────────── */
export default function TasksPage() {
  const { status } = useSession();
  if (status === "unauthenticated") return <LandingPage/>;
  return <Dashboard/>;
}

/* ─────────────────────── Dashboard ─────────────────────── */
function Dashboard() {
  const {
    tasks, filters, updateFilter, activeViewId, savedViews,
    taskCategoryMap, taskStatusMap, loadView, resetFilters,
    activeTaskId, deleteView,
    taskToDeleteId, setTaskToDeleteId, confirmDeleteTask,
    viewToDelete, setViewToDelete, confirmDeleteView,
  } = useView();

  const taskToDelete = tasks.find(t => t.id === taskToDeleteId);

  const [search, setSearch]                   = useState("");
  const [mobileViewsOpen, setMobileViewsOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showAdd, setShowAdd]                 = useState(false);
  const [refreshing, setRefreshing]           = useState(false);

  const handleHardRefresh = async () => {
    setRefreshing(true);
    try {
      // 1. Unregister all service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      // 2. Clear all cache storages
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      // 3. Perform a full browser reload
      window.location.reload();
    } catch (err) {
      console.error("Failed to hard refresh:", err);
      window.location.reload();
    }
  };

  const activeView = savedViews.find(v => v.id === activeViewId);
  const pageTitle  = activeView ? `${activeView.emoji} ${activeView.name}` : "Tasks";

  const mappedTasks = useMemo(() => tasks.map(t => ({
    ...t,
    category: (taskCategoryMap[t.id] ?? t.category) as any,
    status:   (taskStatusMap[t.id]   ?? t.status)   as any,
  })), [tasks, taskCategoryMap, taskStatusMap]);

  const filtered = useMemo(() => mappedTasks.filter(t => {
    if (filters.categories.length>0 && !filters.categories.includes(t.category)) return false;
    if (filters.priorities.length>0 && !filters.priorities.includes(t.priority)) return false;
    if (filters.statuses.length>0   && !filters.statuses.includes(t.status))    return false;
    if (!matchDate(t.dueDate, filters.datePreset, filters.dateFrom, filters.dateTo)) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [mappedTasks, filters, search]);

  const today   = new Date(); today.setHours(0,0,0,0);
  const done    = filtered.filter(t => t.status==="DONE").length;
  const overdue = filtered.filter(t => t.dueDate && new Date(t.dueDate)<today && t.status!=="DONE" && t.status!=="CANCELLED").length;
  const pct     = filtered.length ? Math.round(done/filtered.length*100) : 0;

  const hasFilters = filters.categories.length>0||filters.priorities.length>0||filters.statuses.length>0||!!filters.datePreset||!!filters.dateFrom||!!filters.dateTo;
  const filterCount= filters.categories.length+filters.priorities.length+filters.statuses.length+(hasFilters&&(filters.datePreset||filters.dateFrom)?1:0);

  function handleSort(f: SortField) {
    updateFilter("sortBy", f);
    updateFilter("sortDir", filters.sortBy===f?(filters.sortDir==="asc"?"desc":"asc"):"asc");
  }

  const needsFullHeight = filters.viewType==="week"||filters.viewType==="kanban";

  return (
    <div className={`bg-[#fffcf9] flex flex-col ${needsFullHeight?"h-[calc(100dvh)] lg:h-screen overflow-hidden":"min-h-screen"}`}>

      {/* ═══════════ MOBILE STICKY HEADER ═══════════ */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shrink-0">

        {/* Top row: logo, view title, actions */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
          {/* Logo pill */}
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M5 12l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* View name + picker */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setMobileViewsOpen(o => !o)}
              className="flex items-center gap-1 w-full text-left"
            >
              <span className="text-[15px] font-bold text-stone-900 truncate leading-tight">{pageTitle}</span>
              <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${mobileViewsOpen?"rotate-180":""}`}/>
            </button>

            {/* ─ Views dropdown (simple list, no drag-and-drop on mobile) ─ */}
            {mobileViewsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileViewsOpen(false)}/>
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-4 py-2.5 border-b border-stone-100 bg-stone-50">Views</p>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {savedViews.map(v => {
                      const isPreset = PRESET_SAVED_VIEWS.some(p => p.id===v.id);
                      const isActive = activeViewId===v.id;
                      return (
                        <div key={v.id} className={`flex items-center border-b border-stone-50 last:border-0 ${isActive?"bg-orange-50":""}`}>
                          <button
                            onClick={() => { loadView(v); setMobileViewsOpen(false); }}
                            className="flex-1 flex items-center gap-3 px-4 py-3 text-sm text-left"
                          >
                            <span className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-base shrink-0">{v.emoji}</span>
                            <span className={`flex-1 truncate font-medium ${isActive?"text-orange-700":"text-stone-700"}`}>{v.name}</span>
                            {isActive && <Check className="w-4 h-4 text-orange-500 shrink-0"/>}
                          </button>
                          {!isPreset && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteView(v); }}
                              className="p-3 text-stone-300 hover:text-red-500 transition-colors shrink-0"
                            ><Trash2 className="w-3.5 h-3.5"/></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Icon actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setMobileFilterOpen(o => !o)}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${mobileFilterOpen||hasFilters?"bg-orange-100 text-orange-600":"bg-stone-100 text-stone-500"}`}
            >
              <SlidersHorizontal className="w-4 h-4"/>
              {filterCount>0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
            <button
              onClick={handleHardRefresh}
              disabled={refreshing}
              title="Hard Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 text-stone-500 shrink-0 active:scale-95 transition-transform disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-orange-500" : ""}`} />
            </button>
            <Link href="/settings" className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 text-stone-500 shrink-0">
              <Settings className="w-4 h-4"/>
            </Link>
            <button onClick={() => signOut()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 shrink-0">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Search bar — always visible on mobile */}
        <div className="px-4 pb-2.5">
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="h-9 w-full pl-9 pr-8 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                <X className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible filter panel */}
        {mobileFilterOpen && (
          <div className="border-t border-stone-100 px-4 py-3 bg-orange-50/40">
            <MobileFilterPanel hasFilters={hasFilters} onClose={() => setMobileFilterOpen(false)}/>
          </div>
        )}

        {/* Progress strip */}
        <div className="px-4 pb-2.5 flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
              style={{width:`${pct}%`}}
            />
          </div>
          <span className="text-[11px] font-semibold text-stone-400 shrink-0 tabular-nums">
            {done}/{filtered.length}
            {overdue>0 && <span className="text-red-500 ml-1">· ⚠️ {overdue}</span>}
          </span>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`max-w-[1440px] w-full mx-auto px-4 lg:px-8 flex flex-col flex-1 overflow-hidden ${needsFullHeight?"":"overflow-y-auto"}`}>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between py-5 shrink-0">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{pageTitle}</h1>
              <ProgressStrip total={filtered.length} done={done} overdue={overdue}/>
            </div>

          </div>

          {/* Desktop filter bar */}
          <div className="hidden lg:block shrink-0 mb-3">
            <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm">
              <FilterBar search={search} setSearch={setSearch}/>
            </div>
          </div>

          {/* View content */}
          <div className={`mt-2 lg:mt-0 ${needsFullHeight?"flex-1 overflow-hidden":"pb-24"}`}>
            {filters.viewType==="kanban" ? (
              <div className="h-full overflow-auto"><KanbanView tasks={filtered}/></div>
            ) : filters.viewType==="week" ? (
              <div className="h-full"><WeekView tasks={filtered}/></div>
            ) : (
              <TableView tasks={filtered} sortBy={filters.sortBy} sortDir={filters.sortDir} onSort={handleSort} groupBy={filters.groupBy}/>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ UNIFIED VOICE FAB ═══════════ */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 lg:bottom-8 right-5 lg:right-8 z-40 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
        title="Add task via Voice"
        aria-label="Add task via Voice"
      >
        <Mic className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.25} />
      </button>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)}/>}
      {activeTaskId && <TaskDetailsModal taskId={activeTaskId}/>}

      {/* ═══════════ CUSTOM DELETE CONFIRMATION MODALS ═══════════ */}
      {taskToDeleteId && taskToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={() => setTaskToDeleteId(null)}/>
          <div className="relative bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4 shrink-0 shadow-inner">
                <Trash2 className="w-5 h-5"/>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">Delete Task</h3>
              <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-stone-700">"{taskToDelete.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setTaskToDeleteId(null)} 
                  className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteTask} 
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={() => setViewToDelete(null)}/>
          <div className="relative bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4 shrink-0 shadow-inner">
                <Trash2 className="w-5 h-5"/>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">Delete Saved View</h3>
              <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                Are you sure you want to delete the view <span className="font-semibold text-stone-700">"{viewToDelete.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setViewToDelete(null)} 
                  className="flex-1 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteView} 
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
