"use client";
import { useState, useRef, useEffect } from "react";
import { Table2, LayoutDashboard, CalendarDays, Search, ChevronDown, X, BookmarkPlus, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Layers, SlidersHorizontal } from "lucide-react";
import { useView } from "@/lib/viewContext";
import { type ViewType, type Priority, type Status, type SortField, type GroupBy, getCatMeta, PRIORITY_META, STATUS_META } from "@/lib/taskData";

function useOutside(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

function DD<T extends string>({ label, options, selected, onToggle, onClear, onSelectAll, renderOpt }: {
  label: string; options: T[]; selected: T[]; onToggle: (v: T) => void; onClear: () => void; onSelectAll: () => void; renderOpt: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const active = selected.length > 0;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${active ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>
        {label}{active && <><span className="font-bold text-orange-600 ml-0.5">{selected.length}</span><span role="button" onClick={e => { e.stopPropagation(); onClear(); }} className="hover:text-red-500 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></span></>}
        {!active && <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-orange-100 rounded-xl shadow-lg min-w-[180px] py-1.5 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 mb-1 border-b border-orange-50 bg-orange-50/20">
            <button onClick={onSelectAll} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wider transition-colors">Select all</button>
            <button onClick={onClear} className="text-[10px] font-bold text-stone-400 hover:text-red-500 uppercase tracking-wider transition-colors">Clear all</button>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {options.map(o => (
              <button key={o} onClick={() => onToggle(o)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 text-left">
                <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 ${selected.includes(o) ? "bg-orange-500 border-orange-500" : "border-stone-300"}`}>
                  {selected.includes(o) && <svg viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="9 1 4 7 1 4" /></svg>}
                </span>
                {renderOpt(o)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DateFilter() {
  const { filters, updateFilter } = useView();
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const presets = [
    { id: "today", label: "Today", e: "☀️" }, { id: "tomorrow", label: "Tomorrow", e: "📅" },
    { id: "this_week", label: "This week", e: "📆" }, { id: "next_week", label: "Next week", e: "🗓️" },
    { id: "overdue", label: "Overdue", e: "⚠️" }, { id: "no_date", label: "No date", e: "—" },
  ];
  const active = !!(filters.datePreset || filters.dateFrom || filters.dateTo);
  const cur = presets.find(p => p.id === filters.datePreset);
  function clear() { updateFilter("datePreset", null); updateFilter("dateFrom", null); updateFilter("dateTo", null); }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${active ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>
        <CalendarDays className="w-3.5 h-3.5" />
        {active ? <>{cur ? `${cur.e} ${cur.label}` : `${filters.dateFrom ?? ""} → ${filters.dateTo ?? ""}`}<span role="button" onClick={e => { e.stopPropagation(); clear(); }} className="hover:text-red-500 ml-0.5 cursor-pointer"><X className="w-3 h-3" /></span></> : <><span>Due date</span><ChevronDown className={`w-3 h-3 ${open ? "rotate-180" : ""}`} /></>}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-orange-100 rounded-xl shadow-lg w-60 p-3">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Quick select</p>
          <div className="space-y-0.5 mb-3">
            {presets.map(p => (
              <button key={p.id} onClick={() => { updateFilter("datePreset", p.id as any); updateFilter("dateFrom", null); updateFilter("dateTo", null); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${filters.datePreset === p.id ? "bg-orange-50 text-orange-700" : "hover:bg-stone-50 text-stone-700"}`}>
                <span>{p.e}</span>{p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-stone-100 pt-3 space-y-2">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Custom range</p>
            <div>
              <label className="text-[11px] text-stone-500 font-medium block mb-1">From</label>
              <input type="date" value={filters.dateFrom ?? ""} onChange={e => { updateFilter("dateFrom", e.target.value || null); updateFilter("datePreset", "custom" as any); }}
                className="w-full text-xs px-2.5 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50" />
            </div>
            <div>
              <label className="text-[11px] text-stone-500 font-medium block mb-1">To</label>
              <input type="date" value={filters.dateTo ?? ""} onChange={e => { updateFilter("dateTo", e.target.value || null); updateFilter("datePreset", "custom" as any); }}
                className="w-full text-xs px-2.5 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SORT_FIELDS: { id: SortField; label: string }[] = [{ id: "dueDate", label: "Due date" }, { id: "priority", label: "Priority" }, { id: "status", label: "Status" }, { id: "category", label: "Category" }, { id: "title", label: "Title" }];
const GROUP_OPTS: { id: GroupBy; label: string }[] = [{ id: "none", label: "No grouping" }, { id: "status", label: "Status" }, { id: "category", label: "Category" }, { id: "priority", label: "Priority" }];
const VIEWS: { id: ViewType; label: string; icon: React.ElementType }[] = [{ id: "table", label: "Table", icon: Table2 }, { id: "kanban", label: "Kanban", icon: LayoutDashboard }, { id: "week", label: "Week", icon: CalendarDays }];
const ALL_PRIS: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const ALL_STATS: Status[] = ["BACKLOG", "SCHEDULED", "IN_PROGRESS", "DONE", "CANCELLED"];

function SaveViewDialog({ onSave, onClose }: { onSave: (n: string, e: string) => void; onClose: () => void }) {
  const [name, setName] = useState(""); const [emoji, setEmoji] = useState("📋");
  const emojis = ["📋", "💼", "🏃", "🏦", "🏠", "❤️", "🎯", "⚡", "🌟", "🔥", "⚠️", "📌"];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-orange-100 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-base font-semibold text-stone-900 mb-4">Save current view</h3>
        <div className="flex gap-1.5 flex-wrap mb-4">{emojis.map(e => <button key={e} onClick={() => setEmoji(e)} className={`w-8 h-8 rounded-lg text-base flex items-center justify-center ${emoji === e ? "bg-orange-100 ring-2 ring-orange-400" : "hover:bg-stone-100"}`}>{e}</button>)}</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="View name…" onKeyDown={e => e.key === "Enter" && name.trim() && onSave(name.trim(), emoji)}
          className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-stone-200 text-sm font-medium text-stone-600">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim(), emoji)} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-sm font-semibold text-white transition-colors">Save View</button>
        </div>
      </div>
    </div>
  );
}

export default function FilterBar({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  const { filters, updateFilter, saveCurrentView, resetFilters, allCategories } = useView();
  const [saveDialog, setSaveDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle<T>(arr: T[], val: T): T[] { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }

  const hasFilters = filters.categories.length > 0 || filters.priorities.length > 0 || filters.statuses.length > 0 || !!filters.datePreset || !!filters.dateFrom || !!filters.dateTo;
  const activeCount = filters.categories.length + filters.priorities.length + filters.statuses.length + (hasFilters && (filters.datePreset || filters.dateFrom) ? 1 : 0);

  const sortRef = useOutside(() => setSortOpen(false));
  const groupRef = useOutside(() => setGroupOpen(false));
  const [sortOpen, setSortOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <div>
      {/* ── Mobile compact row ── */}
      <div className="flex lg:hidden items-center gap-2">
        <div className="flex items-center bg-orange-100/50 rounded-lg p-0.5 gap-0.5 shrink-0">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => updateFilter("viewType", id)} className={`flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition-all ${filters.viewType === id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-orange-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-8 w-full pl-8 pr-3 rounded-lg border border-orange-100 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <button onClick={() => setMobileOpen(o => !o)} className={`relative flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all shrink-0 ${mobileOpen || hasFilters ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-white text-stone-600 border-stone-200"}`}>
          <SlidersHorizontal className="w-3.5 h-3.5" />Filters
          {activeCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeCount}</span>}
        </button>
      </div>

      {/* ── Mobile filter panel ── */}
      {mobileOpen && (
        <div className="lg:hidden mt-3 p-3 bg-orange-50/50 border border-orange-100 rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <DateFilter />
            <DD label="Category" options={allCategories.map(c => c.id)} selected={filters.categories} onToggle={v => updateFilter("categories", toggle(filters.categories, v))} onClear={() => updateFilter("categories", [])} onSelectAll={() => updateFilter("categories", allCategories.map(c => c.id))} renderOpt={c => { const m = getCatMeta(c, allCategories); return <span className="flex items-center gap-2 text-sm text-stone-700"><span className={`w-2 h-2 rounded-full ${m.dot}`} />{m.label}</span>; }} />
            <DD label="Priority" options={ALL_PRIS} selected={filters.priorities} onToggle={v => updateFilter("priorities", toggle(filters.priorities, v))} onClear={() => updateFilter("priorities", [])} onSelectAll={() => updateFilter("priorities", ALL_PRIS)} renderOpt={p => <span className="flex items-center gap-2 text-sm text-stone-700"><span className={`w-2 h-2 rounded-full ${PRIORITY_META[p].dot}`} />{PRIORITY_META[p].label}</span>} />
            <DD label="Status" options={ALL_STATS} selected={filters.statuses} onToggle={v => updateFilter("statuses", toggle(filters.statuses, v))} onClear={() => updateFilter("statuses", [])} onSelectAll={() => updateFilter("statuses", ALL_STATS)} renderOpt={s => <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_META[s].badge} ${STATUS_META[s].text}`}>{STATUS_META[s].label}</span>} />
          </div>
          <div className="flex gap-2">
            {hasFilters && <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 h-8 px-3 rounded-lg border border-stone-200 bg-white"><RotateCcw className="w-3.5 h-3.5" />Clear</button>}
            <button onClick={() => setSaveDialog(true)} className="flex items-center gap-1.5 h-8 text-xs font-semibold text-orange-600 border border-orange-200 bg-orange-50 px-3 rounded-lg ml-auto"><BookmarkPlus className="w-3.5 h-3.5" />Save view</button>
          </div>
        </div>
      )}

      {/* ── Desktop full row ── */}
      <div className="hidden lg:flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-orange-100/50 rounded-lg p-0.5 gap-0.5 shrink-0">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => updateFilter("viewType", id)} className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all ${filters.viewType === id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />{label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-orange-100 shrink-0" />
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-orange-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" className="h-8 pl-8 pr-3 rounded-lg border border-orange-100 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 w-44" />
        </div>
        <div className="w-px h-5 bg-orange-100 shrink-0" />
        <DateFilter />
        <DD label="Category" options={allCategories.map(c => c.id)} selected={filters.categories} onToggle={v => updateFilter("categories", toggle(filters.categories, v))} onClear={() => updateFilter("categories", [])} onSelectAll={() => updateFilter("categories", allCategories.map(c => c.id))} renderOpt={c => { const m = getCatMeta(c, allCategories); return <span className="flex items-center gap-2 text-sm text-stone-700"><span className={`w-2 h-2 rounded-full ${m.dot}`} />{m.label}</span>; }} />
        <DD label="Priority" options={ALL_PRIS} selected={filters.priorities} onToggle={v => updateFilter("priorities", toggle(filters.priorities, v))} onClear={() => updateFilter("priorities", [])} onSelectAll={() => updateFilter("priorities", ALL_PRIS)} renderOpt={p => <span className="flex items-center gap-2 text-sm text-stone-700"><span className={`w-2 h-2 rounded-full ${PRIORITY_META[p].dot}`} />{PRIORITY_META[p].label}</span>} />
        <DD label="Status" options={ALL_STATS} selected={filters.statuses} onToggle={v => updateFilter("statuses", toggle(filters.statuses, v))} onClear={() => updateFilter("statuses", [])} onSelectAll={() => updateFilter("statuses", ALL_STATS)} renderOpt={s => <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_META[s].badge} ${STATUS_META[s].text}`}>{STATUS_META[s].label}</span>} />
        <div className="w-px h-5 bg-stone-200 shrink-0" />
        {/* Sort */}
        <div ref={sortRef} className="relative flex items-center gap-0.5">
          <button onClick={() => setSortOpen(o => !o)} className="flex items-center gap-1.5 h-8 px-3 rounded-l-lg text-xs font-medium bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />{SORT_FIELDS.find(f => f.id === filters.sortBy)?.label}<ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          <button onClick={() => updateFilter("sortDir", filters.sortDir === "asc" ? "desc" : "asc")} className="h-8 w-8 rounded-r-lg border border-l-0 border-stone-200 bg-white text-stone-400 hover:text-orange-600 hover:bg-orange-50 flex items-center justify-center transition-all">
            {filters.sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
          {sortOpen && <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-stone-200 rounded-xl shadow-lg w-44 py-1.5">{SORT_FIELDS.map(f => <button key={f.id} onClick={() => { updateFilter("sortBy", f.id); setSortOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${filters.sortBy === f.id ? "bg-orange-50 text-orange-700 font-medium" : "hover:bg-stone-50 text-stone-700"}`}>{f.label}</button>)}</div>}
        </div>
        {/* Group */}
        <div ref={groupRef} className="relative">
          <button onClick={() => setGroupOpen(o => !o)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all ${filters.groupBy !== "none" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>
            <Layers className="w-3.5 h-3.5" />{filters.groupBy !== "none" ? `Group: ${GROUP_OPTS.find(o => o.id === filters.groupBy)?.label}` : "Group by"}<ChevronDown className={`w-3 h-3 transition-transform ${groupOpen ? "rotate-180" : ""}`} />
          </button>
          {groupOpen && <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-orange-100 rounded-xl shadow-lg w-44 py-1.5">{GROUP_OPTS.map(o => <button key={o.id} onClick={() => { updateFilter("groupBy", o.id); setGroupOpen(false); }} className={`w-full px-3 py-2 text-sm text-left transition-colors ${filters.groupBy === o.id ? "bg-orange-50 text-orange-700 font-medium" : "hover:bg-orange-50/50 text-stone-700"}`}>{o.label}</button>)}</div>}
        </div>
        {hasFilters && <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-500 h-8 px-2"><RotateCcw className="w-3.5 h-3.5" />Clear</button>}
        <button onClick={() => setSaveDialog(true)} className="flex items-center gap-1.5 h-8 text-xs font-semibold text-orange-600 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 rounded-lg ml-auto shrink-0 transition-colors"><BookmarkPlus className="w-3.5 h-3.5" />Save view</button>
      </div>

      {/* Active chips */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2.5 border-t border-stone-100">
          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mr-1">Active:</span>
          {filters.datePreset && <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">📅 {filters.datePreset.replace("_", " ")}<button onClick={() => { updateFilter("datePreset", null); updateFilter("dateFrom", null); updateFilter("dateTo", null); }} className="ml-0.5 hover:opacity-60"><X className="w-3 h-3" /></button></span>}
          {filters.categories.map(c => { const m = getCatMeta(c, allCategories); return <span key={c} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${m.badge} ${m.text} border-orange-100`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}<button onClick={() => updateFilter("categories", filters.categories.filter(x => x !== c))} className="ml-0.5 hover:opacity-60"><X className="w-3 h-3" /></button></span>; })}
          {filters.priorities.map(p => <span key={p} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200"><span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[p].dot}`} />{PRIORITY_META[p].label}<button onClick={() => updateFilter("priorities", filters.priorities.filter(x => x !== p))} className="ml-0.5 hover:opacity-60"><X className="w-3 h-3" /></button></span>)}
          {filters.statuses.map(s => <span key={s} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${STATUS_META[s].badge} ${STATUS_META[s].text} border-stone-100`}>{STATUS_META[s].label}<button onClick={() => updateFilter("statuses", filters.statuses.filter(x => x !== s))} className="ml-0.5 hover:opacity-60"><X className="w-3 h-3" /></button></span>)}
        </div>
      )}

      {saveDialog && <SaveViewDialog onSave={(n, e) => { saveCurrentView(n, e); setSaveDialog(false); }} onClose={() => setSaveDialog(false)} />}
    </div>
  );
}
