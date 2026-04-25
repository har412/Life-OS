"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Search, Check } from "lucide-react";
import { useView } from "@/lib/viewContext";
import { type CategoryDef } from "@/lib/taskData";

export default function CategorySelect({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (catId: string) => void;
  triggerClassName?: string;
}) {
  const { allCategories, addCategory } = useView();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = allCategories.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = allCategories.find(c => c.label.toLowerCase() === search.trim().toLowerCase());
  
  const selectedCat = allCategories.find(c => c.id === value) || allCategories[0];

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleAdd = async () => {
    if (!search.trim()) return;
    const cat = await addCategory(search.trim());
    if (cat) onChange(cat.id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={triggerClassName || "w-full flex items-center justify-between px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 hover:bg-stone-50 transition-colors"}
      >
        {selectedCat ? (
          <span className={`inline-flex items-center gap-1.5 font-medium ${selectedCat.text}`}>
            <span className={`w-2 h-2 rounded-full ${selectedCat.dot}`}/>
            {selectedCat.label}
          </span>
        ) : (
          <span className="text-stone-400">Select category...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[220px] bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-stone-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-stone-400 shrink-0 ml-1" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or create..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-stone-300"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length > 0) handleSelect(filtered[0].id);
                  else handleAdd();
                }
              }}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-1.5">
            {filtered.length > 0 ? (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                    value === c.id ? "bg-orange-50" : "hover:bg-stone-50"
                  }`}
                >
                  <span className={`flex items-center gap-2 font-medium ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
                    {c.label}
                  </span>
                  {value === c.id && <Check className="w-3.5 h-3.5 text-orange-500" />}
                </button>
              ))
            ) : (
              search.trim() && (
                <div className="px-2 py-3 text-center">
                  <p className="text-xs text-stone-400 mb-2">No categories found</p>
                  <button
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold transition-colors border border-orange-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create "{search.trim()}"
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
