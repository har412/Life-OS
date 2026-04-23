"use client";
import { Circle, CheckCircle2, Pencil, Trash2, Clock } from "lucide-react";
import { PRIORITY_META, STATUS_META, formatDate, getCatMeta, type Task } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";

export default function TaskCard({ task }: { task: Task }) {
  const { deleteTask, setActiveTaskId, allCategories } = useView();
  const cat    = getCatMeta(task.category, allCategories);
  const status = STATUS_META[task.status];
  const due    = formatDate(task.dueDate);
  const done   = task.status === "DONE";

  return (
    <div className={`group flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all ${done ? "opacity-60" : ""}`}>
      <button className="shrink-0 text-stone-300 hover:text-emerald-500 transition-colors">
        {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={1.75}/> : <Circle className="w-5 h-5" strokeWidth={1.5}/>}
      </button>
      <div className={`w-1 h-9 rounded-full shrink-0 ${cat.dot}`}/>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${done ? "text-stone-400 line-through" : "text-stone-800"}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.badge} ${status.text}`}>{status.label}</span>
          <span className={`text-xs font-medium ${cat.text} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}/>{cat.label}
          </span>
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${due.isOverdue ? "text-red-500 font-medium" : due.isToday ? "text-orange-600 font-medium" : "text-stone-400"}`}>
              <Clock className="w-3 h-3"/>{due.text}{task.time ? ` · ${task.time}` : ""}
            </span>
          )}
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_META[task.priority].dot}`}/>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={(e) => { e.stopPropagation(); setActiveTaskId(task.id); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    </div>
  );
}
