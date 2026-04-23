"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, AlertTriangle, ChevronDown } from "lucide-react";
import { useView } from "@/lib/viewContext";
import { CUSTOM_CAT_COLORS, type CategoryDef, BUILT_IN_CATEGORIES } from "@/lib/taskData";

/* ─── Color palette picker ─────────────────── */
const COLOR_SWATCHES = [
  { bg:"bg-blue-500",    label:"Blue" },
  { bg:"bg-emerald-500", label:"Emerald" },
  { bg:"bg-amber-500",   label:"Amber" },
  { bg:"bg-red-500",     label:"Red" },
  { bg:"bg-purple-500",  label:"Purple" },
  { bg:"bg-pink-500",    label:"Pink" },
  { bg:"bg-teal-500",    label:"Teal" },
  { bg:"bg-orange-500",  label:"Orange" },
  { bg:"bg-indigo-500",  label:"Indigo" },
  { bg:"bg-cyan-500",    label:"Cyan" },
  { bg:"bg-lime-500",    label:"Lime" },
  { bg:"bg-rose-500",    label:"Rose" },
];

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (idx: number, bg: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 p-3 bg-stone-50 rounded-xl border border-stone-200">
      {COLOR_SWATCHES.map((s, i) => (
        <button
          key={s.bg}
          title={s.label}
          onClick={() => onSelect(i, s.bg)}
          className={`w-6 h-6 rounded-full transition-all ${s.bg} ${
            selected === s.bg ? "ring-2 ring-offset-1 ring-stone-700 scale-110" : "hover:scale-110"
          }`}
        />
      ))}
    </div>
  );
}

/* ─── Delete confirm / reassign modal ─────── */
function DeleteModal({
  cat, taskCount, allCats, onConfirm, onCancel,
}: {
  cat: CategoryDef;
  taskCount: number;
  allCats: CategoryDef[];
  onConfirm: (reassignTo?: string) => void;
  onCancel: () => void;
}) {
  const others = allCats.filter(c => c.id !== cat.id);
  const [reassignTo, setReassignTo] = useState(others[0]?.id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-4 h-4 text-red-500"/>
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Delete "{cat.label}"</h3>
            {taskCount > 0
              ? <p className="text-sm text-stone-500 mt-1">This category has <span className="font-semibold text-stone-700">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>. Choose where to move them before deleting.</p>
              : <p className="text-sm text-stone-500 mt-1">This category is empty. Are you sure you want to delete it?</p>}
          </div>
        </div>

        {taskCount > 0 && others.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">Move tasks to</label>
            <div className="relative">
              <select
                value={reassignTo}
                onChange={e => setReassignTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400 pr-8"
              >
                {others.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
            </div>
            {taskCount > 0 && (
              <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0"/>
                {taskCount} task{taskCount !== 1 ? "s" : ""} will be moved to "{others.find(c => c.id === reassignTo)?.label}"
              </p>
            )}
          </div>
        )}

        {taskCount > 0 && others.length === 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
            No other categories exist. Create one first to reassign tasks.
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(taskCount > 0 ? reassignTo : undefined)}
            disabled={taskCount > 0 && others.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-sm font-bold text-white transition-colors"
          >
            {taskCount > 0 ? "Move & Delete" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Single category row ──────────────────── */
function CategoryRow({ cat }: { cat: CategoryDef }) {
  const { editCategory, deleteCategory, getTaskCount, allCategories } = useView();
  const [editing,     setEditing]     = useState(false);
  const [editLabel,   setEditLabel]   = useState(cat.label);
  const [editColorIdx,setEditColorIdx]= useState<number | undefined>(undefined);
  const [showPicker,  setShowPicker]  = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [delHover,    setDelHover]    = useState(false);

  const taskCount   = getTaskCount(cat.id);
  const isBuiltIn   = BUILT_IN_CATEGORIES.some(c => c.id === cat.id);
  const activeDot   = editColorIdx !== undefined ? COLOR_SWATCHES[editColorIdx].bg : cat.dot;

  function saveEdit() {
    if (editLabel.trim()) editCategory(cat.id, editLabel.trim(), editColorIdx);
    setEditing(false);
    setShowPicker(false);
    setEditColorIdx(undefined);
  }

  function cancelEdit() {
    setEditLabel(cat.label);
    setEditing(false);
    setShowPicker(false);
    setEditColorIdx(undefined);
  }

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
        editing ? "border-orange-200 bg-orange-50/30" : delHover ? "border-red-100 bg-red-50/40" : "border-stone-200 bg-white hover:border-stone-300"
      }`}>
        {/* Color swatch (clickable when editing) */}
        <button
          onClick={() => editing && setShowPicker(p => !p)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeDot} ${editing ? "cursor-pointer ring-2 ring-offset-1 ring-orange-400 shadow-sm" : "cursor-default"}`}
          title={editing ? "Change color" : cat.label}
        >
          <span className="text-white text-xs font-bold">{cat.label[0]}</span>
        </button>

        {/* Name / edit input */}
        {editing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
            className="flex-1 px-2 py-1 rounded-lg border border-orange-300 bg-white text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900">{cat.label}</p>
            {isBuiltIn && <p className="text-[10px] text-stone-400 font-medium">Built-in</p>}
          </div>
        )}

        {/* Task count badge */}
        <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
          taskCount > 0 ? `${cat.badge} ${cat.text}` : "bg-stone-100 text-stone-400"
        }`}>
          {taskCount} task{taskCount !== 1 ? "s" : ""}
        </div>

        {/* Action buttons */}
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={saveEdit} className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors">
              <Check className="w-3.5 h-3.5"/>
            </button>
            <button onClick={cancelEdit} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
              <X className="w-3.5 h-3.5"/>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setEditing(true); setEditLabel(cat.label); }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5"/>
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              onMouseEnter={() => setDelHover(true)}
              onMouseLeave={() => setDelHover(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        )}
      </div>

      {/* Color picker (shown below row when editing) */}
      {editing && showPicker && (
        <div className="mx-1 -mt-1">
          <ColorPicker
            selected={activeDot}
            onSelect={(idx, _) => { setEditColorIdx(idx); setShowPicker(false); }}
          />
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDel && (
        <DeleteModal
          cat={cat}
          taskCount={taskCount}
          allCats={allCategories}
          onConfirm={reassignTo => { deleteCategory(cat.id, reassignTo); setConfirmDel(false); }}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </>
  );
}

/* ─── Add new category row ─────────────────── */
function AddCategoryRow() {
  const { addCategory } = useView();
  const [open,  setOpen]  = useState(false);
  const [label, setLabel] = useState("");

  function save() {
    if (!label.trim()) return;
    addCategory(label.trim());
    setLabel("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-stone-300 text-stone-400 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all text-sm font-medium"
      >
        <Plus className="w-4 h-4"/> Add new category
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-orange-300 bg-orange-50/30">
      <div className="w-8 h-8 rounded-lg bg-stone-300 flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">{label ? label[0].toUpperCase() : "?"}</span>
      </div>
      <input
        autoFocus
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setOpen(false); setLabel(""); } }}
        placeholder="Category name (e.g. Travel)…"
        className="flex-1 px-2 py-1 rounded-lg border border-orange-300 bg-white text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      <button onClick={save} disabled={!label.trim()} className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white transition-colors">
        <Check className="w-3.5 h-3.5"/>
      </button>
      <button onClick={() => { setOpen(false); setLabel(""); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
        <X className="w-3.5 h-3.5"/>
      </button>
    </div>
  );
}

/* ─── Main CategoryManager ─────────────────── */
export default function CategoryManager() {
  const { allCategories, getTaskCount } = useView();

  // Deduplicate — custom overrides take precedence over built-ins
  const seen = new Set<string>();
  const deduplicated = [...allCategories].reverse().filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).reverse();

  const builtIn = deduplicated.filter(c => BUILT_IN_CATEGORIES.some(b => b.id === c.id));
  const custom  = deduplicated.filter(c => !BUILT_IN_CATEGORIES.some(b => b.id === c.id));
  const totalTasks = allCategories.reduce((sum, c) => sum + getTaskCount(c.id), 0);

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-5 p-4 bg-stone-50 rounded-2xl border border-stone-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-stone-900">{deduplicated.length}</p>
          <p className="text-xs text-stone-400 font-medium">Categories</p>
        </div>
        <div className="w-px h-8 bg-stone-200"/>
        <div className="text-center">
          <p className="text-2xl font-bold text-stone-900">{totalTasks}</p>
          <p className="text-xs text-stone-400 font-medium">Total tasks</p>
        </div>
        <div className="w-px h-8 bg-stone-200"/>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {deduplicated.map(c => (
            <span key={c.id} className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.badge} ${c.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Built-in */}
      <div className="mb-5">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Built-in</p>
        <div className="space-y-2">
          {builtIn.map(c => <CategoryRow key={c.id} cat={c}/>)}
        </div>
      </div>

      {/* Custom */}
      {custom.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Custom</p>
          <div className="space-y-2">
            {custom.map(c => <CategoryRow key={c.id} cat={c}/>)}
          </div>
        </div>
      )}

      {/* Add new */}
      <AddCategoryRow/>
    </div>
  );
}
