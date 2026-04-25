"use client";
import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2, Sparkles, ChevronDown, UploadCloud, Trash2, Calendar, Clock, Plus } from "lucide-react";
import { PRIORITY_META, type Priority, type Task } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";
import CategorySelect from "@/components/CategorySelect";

const PRIS = ["LOW","MEDIUM","HIGH","URGENT"] as const;
const PRI_META_LOCAL: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  LOW:    { label: "Low",    bg: "bg-stone-50",    text: "text-stone-600",  border: "border-stone-200",  dot: "bg-stone-300" },
  MEDIUM: { label: "Medium", bg: "bg-amber-50",    text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400" },
  HIGH:   { label: "High",   bg: "bg-orange-50",   text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  URGENT: { label: "Urgent", bg: "bg-red-50",      text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500" },
};

export default function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { allCategories, addTask } = useView();

  const [tab, setTab] = useState<"manual"|"voice">("voice");
  
  // Form State
  const [title,    setTitle]  = useState("");
  const [catId,    setCatId]  = useState("WORK");
  const [pri,      setPri]    = useState<Priority>("MEDIUM");
  const [date,     setDate]   = useState("");
  const [time,     setTime]   = useState("");
  const [desc,     setDesc]   = useState("");
  const [images,   setImages] = useState<string[]>([]);
  const [reminder, setReminder] = useState(0); 
  const [showDetails, setShowDetails] = useState(false);
  
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob);
      const response = await fetch("/api/ai/process", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to process");
      
      const data = await response.json();
      setTranscript(data.transcript);
      
      if (data.tasks && data.tasks.length > 0) {
        const first = data.tasks[0];
        setTitle(first.title || "");
        setDesc(first.description || "");
        if (first.dueDate) setDate(first.dueDate);
        if (first.time) setTime(first.time);
        if (first.categoryId) setCatId(first.categoryId);
        if (first.priority) setPri(first.priority);
        if (first.reminderOffset !== undefined) setReminder(first.reminderOffset ?? 0);
        
        setTab("manual");
        if (first.description) setShowDetails(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  function handleSave() {
    if (!title.trim()) return;
    addTask({
      title,
      categoryId: catId,
      priority: pri,
      dueDate: date || null,
      time: time || null,
      reminderOffset: reminder === -1 ? null : reminder,
      description: desc,
      images,
    });
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-stone-100 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-100">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">New Task</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-stone-50 mx-6 rounded-xl border border-stone-100 shrink-0">
          <button 
            onClick={() => setTab("voice")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${tab === "voice" ? "bg-white text-orange-600 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
          >
            <Mic className={`w-3.5 h-3.5 ${tab === "voice" ? "text-orange-500" : ""}`} />
            Voice First
          </button>
          <button 
            onClick={() => setTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${tab === "manual" ? "bg-white text-orange-600 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
          >
            <Plus className={`w-3.5 h-3.5 ${tab === "manual" ? "text-orange-500" : ""}`} />
            Manual Entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "voice" ? (
            <div className="flex flex-col items-center justify-center py-10 px-8 text-center min-h-[300px]">
              {isProcessing ? (
                <div className="flex flex-col items-center animate-in fade-in duration-500">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-orange-50 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-orange-500 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">AI is Analyzing...</h3>
                </div>
              ) : (
                <>
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 mb-6 ${isRecording ? "bg-orange-500 scale-105 shadow-xl shadow-orange-100" : "bg-orange-50"}`}>
                    {isRecording ? (
                      <Square className="w-8 h-8 text-white" />
                    ) : (
                      <Mic className="w-9 h-9 text-orange-500" />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                    {isRecording ? "Listening..." : "Tell me your task"}
                  </h3>
                  <p className="mt-2 text-xs text-stone-500 max-w-[220px] mx-auto leading-relaxed">
                    {isRecording 
                      ? "I'm listening. Tell me the task and details." 
                      : "Describe your task naturally. I'll handle the rest."}
                  </p>

                  {isRecording && (
                    <div className="mt-6 font-mono text-2xl font-bold text-stone-900">
                      {formatTime(recordingTime)}
                    </div>
                  )}

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`mt-10 px-10 py-3 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-95 ${
                      isRecording 
                        ? "bg-stone-900 text-white shadow-stone-200" 
                        : "bg-orange-500 text-white shadow-orange-100"
                    }`}
                  >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              {/* Form Content */}
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Task Title</label>
                <input
                  autoFocus value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="What's the plan?"
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-50 bg-stone-50 text-base font-semibold text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:border-orange-500/20 transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Category</label>
                  <CategorySelect 
                    value={catId} 
                    onChange={setCatId} 
                    triggerClassName="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs font-bold text-stone-700 hover:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Priority</label>
                  <div className="flex gap-1 p-1 bg-stone-50 rounded-xl border border-stone-100 overflow-x-auto scrollbar-hide">
                    {PRIS.map(p => {
                      const meta = PRI_META_LOCAL[p];
                      const active = pri === p;
                      return (
                        <button
                          key={p} onClick={() => setPri(p)}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                            active 
                              ? `${meta.bg} ${meta.text} shadow-sm border ${meta.border}` 
                              : "text-stone-400 hover:text-stone-600"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500/30 transition-all"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs font-bold text-stone-900 focus:outline-none focus:border-orange-500/30 transition-all"/>
                  </div>
                </div>
              </div>

              {date && time && (
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Reminder</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { val: -1, label: "None" },
                      { val: 0,  label: "At time" },
                      { val: 10, label: "10m" },
                      { val: 30, label: "30m" }
                    ].map(r => (
                      <button
                        key={r.val} onClick={() => setReminder(r.val)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          reminder === r.val 
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm" 
                            : "bg-white text-stone-500 border-stone-100 hover:border-orange-200"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-wider"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`} />
                  {showDetails ? "Less" : "Advanced"}
                </button>
                
                {showDetails && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">Description</label>
                      <textarea
                        value={desc} onChange={e => setDesc(e.target.value)}
                        placeholder="Additional details..." rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-stone-100 bg-stone-50 text-xs font-medium text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white transition-all resize-none shadow-inner"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Images</label>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Upload
                        </button>
                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                      </div>
                      
                      {images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {images.map((img, i) => (
                            <div key={i} className="group relative aspect-square rounded-lg border border-stone-100 overflow-hidden bg-stone-100 shadow-sm">
                              <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-md bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all shadow-md"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-stone-100 text-xs font-bold text-stone-400 hover:bg-stone-50 transition-all">
                  Discard
                </button>
                <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-100 transition-all active:scale-[0.98]">
                  Create Task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
