"use client";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight, Plus, MessageSquare, Image as ImageIcon } from "lucide-react";
import { getCatMeta, PRIORITY_META, formatDate, type Task, type Status } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";

const COLUMNS: { id: Status; label: string; dot: string; badge: string }[] = [
  { id: "BACKLOG",     label: "Backlog",     dot: "bg-stone-400",   badge: "bg-stone-100 text-stone-600" },
  { id: "SCHEDULED",  label: "Scheduled",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700" },
  { id: "IN_PROGRESS",label: "In Progress", dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700" },
  { id: "DONE",       label: "Done",        dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
];

function KanbanCard({ task, index }: { task: Task; index: number }) {
  const { allCategories, setActiveTaskId } = useView();
  const cat  = getCatMeta(task.category, allCategories);
  const pri  = PRIORITY_META[task.priority];
  const due  = formatDate(task.dueDate);
  const done = task.status === "DONE";
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setActiveTaskId(task.id)}
          className={`bg-white border rounded-xl p-3.5 transition-all cursor-pointer active:cursor-grabbing select-none ${
            snapshot.isDragging
              ? "shadow-xl border-orange-300 rotate-1 scale-[1.02]"
              : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
          } ${done ? "opacity-55" : ""}`}
        >
          <div className="flex items-start gap-2 mb-2">
            <div className={`w-1 rounded-full shrink-0 ${cat.dot}`} style={{ height: 28 }} />
            <p className={`text-sm font-medium leading-snug flex-1 ${done ? "text-stone-400 line-through" : "text-stone-800"}`}>
              {task.title}
            </p>
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${pri.dot}`} title={pri.label} />
          </div>
          {task.dueDate && (
            <p className={`text-xs mb-2 font-medium ${due.isOverdue ? "text-red-500" : due.isToday ? "text-orange-600" : "text-stone-400"}`}>
              {due.isOverdue ? "⚠️ " : "📅 "}{due.text}{task.time ? ` · ${task.time}` : ""}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-50">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${cat.badge} ${cat.text}`}>
              {cat.label}
            </span>
            <div className="flex items-center gap-2 text-stone-400">
              {task.images && task.images.length > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium"><ImageIcon className="w-3.5 h-3.5"/> {task.images.length}</div>
              )}
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium"><MessageSquare className="w-3.5 h-3.5"/> {task.comments.length}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanView({ tasks }: { tasks: Task[] }) {
  const { updateTaskStatus, allCategories, addTask } = useView();
  const [taskState, setTaskState] = useState<Task[]>(tasks);
  const [mobileColIndex, setMobileColIndex] = useState(0);

  const [quickAddCol, setQuickAddCol] = useState<Status | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const handleQuickAdd = (e: React.FormEvent, status: Status) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) { setQuickAddCol(null); return; }
    const newTask: Task = {
      id: `t_${Date.now()}`,
      title: quickAddTitle.trim(),
      category: allCategories[0]?.id || "WORK",
      priority: "MEDIUM",
      status: status,
      dueDate: null,
    };
    addTask(newTask);
    setTaskState(prev => [...prev, newTask]);
    setQuickAddCol(null);
    setQuickAddTitle("");
  };

  // Sync when props change (including title/status/etc)
  useEffect(() => {
    setTaskState(tasks);
  }, [tasks]);

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    const newStatus = destination.droppableId as Status;
    setTaskState(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    updateTaskStatus(draggableId, newStatus);
  }

  const mobileCol = COLUMNS[mobileColIndex];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* ─── Mobile: single column with tab navigation ─── */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Column selector */}
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl p-1.5">
          <button
            onClick={() => setMobileColIndex(i => Math.max(0, i - 1))}
            disabled={mobileColIndex === 0}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 disabled:opacity-30 hover:bg-stone-100 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 flex gap-1">
            {COLUMNS.map((col, i) => {
              const count = taskState.filter(t => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileColIndex(i)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${
                    i === mobileColIndex ? "bg-orange-50" : "hover:bg-stone-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className={`text-[10px] font-semibold truncate ${i === mobileColIndex ? "text-orange-700" : "text-stone-500"}`}>
                    {col.label}
                  </span>
                  <span className={`text-[10px] font-bold ${i === mobileColIndex ? "text-orange-600" : "text-stone-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setMobileColIndex(i => Math.min(COLUMNS.length - 1, i + 1))}
            disabled={mobileColIndex === COLUMNS.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 disabled:opacity-30 hover:bg-stone-100 transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Column header */}
        <div className="flex items-center gap-2 px-1">
          <span className={`w-2.5 h-2.5 rounded-full ${mobileCol.dot}`} />
          <span className="text-sm font-semibold text-stone-800">{mobileCol.label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mobileCol.badge}`}>
            {taskState.filter(t => t.status === mobileCol.id).length}
          </span>
        </div>

        {/* Cards */}
        <Droppable droppableId={mobileCol.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2.5 min-h-[200px] rounded-2xl p-1 transition-colors ${snapshot.isDraggingOver ? "bg-orange-50" : ""}`}
            >
              {taskState.filter(t => t.status === mobileCol.id).map((t, i) => (
                <KanbanCard key={t.id} task={t} index={i} />
              ))}
              {provided.placeholder}
              {taskState.filter(t => t.status === mobileCol.id).length === 0 && !snapshot.isDraggingOver && (
                <div className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-stone-200">
                  <p className="text-xs text-stone-400">No tasks here</p>
                </div>
              )}
              {quickAddCol === mobileCol.id ? (
                <form onSubmit={e => handleQuickAdd(e, mobileCol.id)} className="bg-white border border-orange-300 shadow-sm rounded-xl p-2.5 mt-2 animate-in fade-in duration-200">
                  <input autoFocus value={quickAddTitle} onChange={e => setQuickAddTitle(e.target.value)} onBlur={() => setQuickAddCol(null)} placeholder="Task title..." className="w-full text-sm outline-none placeholder:text-stone-300 text-stone-700"/>
                </form>
              ) : (
                <button onClick={() => { setQuickAddCol(mobileCol.id); setQuickAddTitle(""); }} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-dashed border-stone-200 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add task
                </button>
              )}
            </div>
          )}
        </Droppable>
      </div>

      {/* ─── Desktop: 4-column grid ─── */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4 h-full">
        {COLUMNS.map(col => {
          const colTasks = taskState.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-stone-100 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-stone-800 flex-1">{col.label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.badge}`}>{colTasks.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 space-y-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? "bg-orange-50/50" : ""}`}
                    style={{ minHeight: 400 }}
                  >
                    {colTasks.map((t, i) => <KanbanCard key={t.id} task={t} index={i} />)}
                    {provided.placeholder}
                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-stone-100">
                        <p className="text-xs text-stone-300 font-medium">Drop here</p>
                      </div>
                    )}
                    {quickAddCol === col.id ? (
                      <form onSubmit={e => handleQuickAdd(e, col.id)} className="bg-white border border-orange-300 shadow-sm rounded-xl p-2.5 mt-2 animate-in fade-in duration-200">
                        <input autoFocus value={quickAddTitle} onChange={e => setQuickAddTitle(e.target.value)} onBlur={() => setQuickAddCol(null)} placeholder="Task title..." className="w-full text-sm outline-none placeholder:text-stone-300 text-stone-700"/>
                      </form>
                    ) : (
                      <button onClick={() => { setQuickAddCol(col.id); setQuickAddTitle(""); }} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-dashed border-stone-200 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add task
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
