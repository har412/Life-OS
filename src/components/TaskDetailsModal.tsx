"use client";
import { useState, useRef, useEffect } from "react";
import { X, MessageSquare, Image as ImageIcon, UploadCloud, Trash2, Calendar, Clock, ChevronDown } from "lucide-react";
import { useView } from "@/lib/viewContext";
import { getCatMeta, PRIORITY_META, STATUS_META, type Task } from "@/lib/taskData";
import RichEditor from "@/components/RichEditor";
import CategorySelect from "@/components/CategorySelect";

export default function TaskDetailsModal({ taskId }: { taskId: string }) {
  const { tasks, setActiveTaskId, taskDetailsMap, updateTaskDetails, allCategories, taskCategoryMap, taskStatusMap, deleteTask } = useView();

  
  // Find base task and apply overrides
  const baseTask = tasks.find(t => t.id === taskId);
  if (!baseTask) return null;

  const overrides = taskDetailsMap[taskId] || {};
  const task: Task = {
    ...baseTask,
    ...overrides,
    category: (overrides.category ?? taskCategoryMap[taskId] ?? baseTask.category) as any,
    status: (overrides.status ?? taskStatusMap[taskId] ?? baseTask.status) as any,
    description: overrides.description ?? baseTask.description ?? "",
    images: overrides.images ?? baseTask.images ?? [],
    comments: overrides.comments ?? baseTask.comments ?? [],
  };

  const cat = getCatMeta(task.category, allCategories);
  const pri = PRIORITY_META[task.priority];
  const stat = STATUS_META[task.status];

  const [desc, setDesc] = useState(task.description || "");
  const [commentText, setCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save description on blur
  const handleDescBlur = () => {
    if (desc !== task.description) {
      updateTaskDetails(taskId, { description: desc });
    }
  };

  const handleAddComment = () => {
    // Basic check for empty or just empty tags like <p><br></p>
    const stripped = commentText.replace(/(<([^>]+)>)/gi, "").trim();
    if (!stripped) return;
    
    const newComment = {
      id: `c_${Date.now()}`,
      text: commentText, // Keep HTML
      createdAt: new Date().toISOString(),
      author: "Harkirat" // Mock author
    };
    updateTaskDetails(taskId, { comments: [...(task.comments || []), newComment] });
    setCommentText(""); // Reset
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        updateTaskDetails(taskId, { images: [...(task.images || []), base64] });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const newImages = [...(task.images || [])];
    newImages.splice(index, 1);
    updateTaskDetails(taskId, { images: newImages });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" 
        onClick={() => setActiveTaskId(null)}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-stone-100">
          <div className="flex-1 pr-8">
            <input
              type="text"
              value={task.title}
              onChange={(e) => updateTaskDetails(taskId, { title: e.target.value })}
              className="w-full text-2xl font-bold text-stone-900 leading-tight mb-3 bg-transparent border-none focus:outline-none focus:ring-0 p-0 hover:bg-stone-50 rounded-lg transition-colors"
              placeholder="Task title..."
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative inline-flex">
                <select 
                  value={task.status} 
                  onChange={e => updateTaskDetails(taskId, { status: e.target.value as any })}
                  className={`appearance-none inline-flex items-center gap-1.5 px-2.5 py-1 pr-6 rounded-lg text-xs font-bold cursor-pointer outline-none ${stat.badge} ${stat.text}`}
                >
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </div>
              </div>

              <CategorySelect 
                value={task.category} 
                onChange={id => updateTaskDetails(taskId, { category: id })}
                triggerClassName={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border-none outline-none cursor-pointer ${cat.badge} ${cat.text}`}
              />

              <div className="relative inline-flex">
                <select 
                  value={task.priority} 
                  onChange={e => updateTaskDetails(taskId, { priority: e.target.value as any })}
                  className={`appearance-none inline-flex items-center gap-1.5 px-2.5 py-1 pr-6 rounded-lg text-xs font-bold cursor-pointer outline-none ${pri.badge} ${pri.text}`}
                >
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => deleteTask(taskId)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTaskId(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50 flex flex-col md:flex-row gap-8">
          
          {/* Left Column (Main Content) */}
          <div className="flex-1 space-y-8">
            
            {/* Description */}
            <section>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">📝</span>
                Description
              </h3>
              <RichEditor
                value={desc}
                onChange={setDesc}
                onBlur={handleDescBlur}
                placeholder="Add a more detailed description..."
                minHeight="120px"
              />
            </section>

            {/* Images/Attachments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><ImageIcon className="w-3.5 h-3.5"/></span>
                  Attachments
                </h3>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <UploadCloud className="w-4 h-4" /> Upload Image
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </div>

              {task.images && task.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {task.images.map((img, i) => (
                    <div key={i} className="group relative aspect-video rounded-xl border border-stone-200 overflow-hidden bg-stone-100">
                      <img src={img} alt={`Attachment ${i+1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-stone-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mb-2">
                    <ImageIcon className="w-5 h-5 text-stone-400" />
                  </div>
                  <p className="text-sm font-medium text-stone-600">No attachments yet.</p>
                  <p className="text-xs text-stone-400 mt-1">Upload an image to add it to this task.</p>
                </div>
              )}
            </section>

            {/* Comments */}
            <section>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><MessageSquare className="w-3.5 h-3.5"/></span>
                Activity
              </h3>
              
              <div className="space-y-4 mb-4">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-orange-700">{c.author?.[0] || "U"}</span>
                      </div>
                      <div className="flex-1 bg-white border border-stone-200 rounded-2xl rounded-tl-none p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-stone-900">{c.author || "User"}</span>
                          <span className="text-[10px] font-medium text-stone-400">
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap rich-text-output" dangerouslySetInnerHTML={{ __html: c.text }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500 italic py-2">No comments yet. Start the conversation!</p>
                )}
              </div>

              {/* Comment Input */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-xs font-bold text-white">H</span>
                </div>
                <div className="flex-1 relative">
                  <RichEditor
                    value={commentText}
                    onChange={setCommentText}
                    placeholder="Write a comment..."
                    minHeight="80px"
                  />
                  <div className="mt-2 flex justify-end">
                    <button 
                      onClick={handleAddComment}
                      disabled={!commentText.replace(/(<([^>]+)>)/gi, "").trim()}
                      className="px-4 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors shadow-sm"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column (Metadata Sidebar) */}
          <div className="w-full md:w-64 shrink-0 space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Details</h4>
              
              <div>
                <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5"/> Due Date</span>
                <input 
                  type="date" 
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""} 
                  onChange={e => updateTaskDetails(taskId, { dueDate: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5"/> Time</span>
                <input 
                  type="time" 
                  value={task.time || ""} 
                  onChange={e => updateTaskDetails(taskId, { time: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5 mb-2">🔔 Reminder</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { val: null, label: "None" },
                    { val: 0,    label: "At time" },
                    { val: 10,   label: "10m before" },
                    { val: 30,   label: "30m before" }
                  ].map(r => (
                    <button
                      key={String(r.val)}
                      onClick={() => updateTaskDetails(taskId, { reminderOffset: r.val })}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                        (task.reminderOffset ?? null) === r.val
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
