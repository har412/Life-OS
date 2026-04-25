"use client";
import { useState, useRef } from "react";
import { X, Mic, ChevronDown, UploadCloud, Trash2 } from "lucide-react";
import { PRIORITY_META, type Priority } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";
import CategorySelect from "@/components/CategorySelect";

const PRIS = ["LOW","MEDIUM","HIGH","URGENT"] as const;
const priColors: Record<string,string> = { LOW:"stone",MEDIUM:"amber",HIGH:"orange",URGENT:"red" };

export default function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { allCategories, addCategory, refreshTasks, addTask } = useView();

  const [tab,      setTab]    = useState<"manual"|"voice">("manual");
  const [title,    setTitle]  = useState("");
  const [catId,    setCatId]  = useState("WORK");
  const [pri,      setPri]    = useState<Priority>("MEDIUM");
  const [date,     setDate]   = useState("");
  const [time,     setTime]   = useState("");
  const [desc,     setDesc]   = useState("");
  const [images,   setImages] = useState<string[]>([]);
  const [reminder, setReminder] = useState(0); // 0=at time, 10=10m, 30=30m, -1=none
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    if (!title.trim()) return;
    const newTask = {
      title,
      categoryId: catId,
      priority: pri,
      dueDate: date || null,
      time: time || null,
      reminderOffset: reminder === -1 ? null : reminder,
      description: desc,
      images,
    };
    addTask(newTask);
    onClose();
  }


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setImages(prev => [...prev, base64]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectedCat = allCategories.find(c => c.id === catId) ?? allCategories[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border-t sm:border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-200"/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <h2 className="text-base font-semibold text-stone-900">New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["manual","voice"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab===t?"bg-stone-100 text-stone-900":"text-stone-500 hover:text-stone-700"}`}>
              {t==="voice" ? "🎙 Voice" : "✏️ Manual"}
            </button>
          ))}
        </div>

        {tab === "voice" ? (
          <div className="flex flex-col items-center gap-4 py-12 px-5">
            <button className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 transition-all active:scale-95">
              <Mic className="w-7 h-7 text-white"/>
            </button>
            <p className="text-sm text-stone-500 text-center">
              Tap and say something like<br/>
              <em className="text-stone-400">"Pay loan EMI tomorrow at 11am, urgent"</em>
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="px-5 pt-4 pb-5 space-y-4">
              {/* Title */}
              <input
                autoFocus value={title} onChange={e => setTitle(e.target.value)}
                placeholder="What do you need to do?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Category</p>
                <CategorySelect value={catId} onChange={setCatId} />
              </div>

              {/* Priority */}
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Priority</p>
                <div className="flex gap-1.5">
                  {PRIS.map(p => {
                    const color = priColors[p];
                    const active = pri === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPri(p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                          active
                            ? `bg-${color}-50 text-${color}-700 border-${color}-300 shadow-sm`
                            : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[p as Priority].dot}`}/>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Due Date</p>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Alert Time</p>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                </div>
              </div>

              {/* Reminders */}
              {date && time && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Reminder</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: -1, label: "None" },
                      { val: 0,  label: "At time" },
                      { val: 10, label: "10m before" },
                      { val: 30, label: "30m before" }
                    ].map(r => (
                      <button
                        key={r.val}
                        onClick={() => setReminder(r.val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          reminder === r.val
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                            : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rich Details Toggle */}
              <div>
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                  {showDetails ? "Hide extra details" : "Add description & attachments"}
                </button>
                
                {showDetails && (
                  <div className="mt-4 space-y-4 border-l-2 border-orange-200 pl-4 py-1 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Description</p>
                      <textarea
                        value={desc} onChange={e => setDesc(e.target.value)}
                        placeholder="Add a detailed description..." rows={3}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Attachments</p>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Upload Image
                        </button>
                        <input 
                          type="file" accept="image/*" ref={fileInputRef} className="hidden" 
                          onChange={handleImageUpload}
                        />
                      </div>
                      
                      {images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {images.map((img, i) => (
                            <div key={i} className="group relative aspect-video rounded-lg border border-stone-200 overflow-hidden bg-stone-100">
                              <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-sm"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-stone-500 italic px-2 py-1 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                          No attachments added yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white shadow-sm transition-colors">
                  Save Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
