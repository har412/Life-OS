"use client";
import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2, Sparkles, ChevronDown, UploadCloud, Trash2, Calendar, Clock, Plus } from "lucide-react";
import { PRIORITY_META, type Priority, type Task } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";
import CategorySelect from "@/components/CategorySelect";

const PRIS = ["LOW","MEDIUM","HIGH","URGENT"] as const;
const priColors: Record<string,string> = { LOW:"stone",MEDIUM:"amber",HIGH:"orange",URGENT:"red" };

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
        
        // Auto-switch to manual tab for review/edit
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
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-100">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Add New Task</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-200 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-2 bg-stone-100/50 mx-6 mt-4 rounded-2xl shrink-0">
          <button 
            onClick={() => setTab("voice")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "voice" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
          >
            <Mic className={`w-4 h-4 ${tab === "voice" ? "text-orange-500" : ""}`} />
            Voice First
          </button>
          <button 
            onClick={() => setTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "manual" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
          >
            <Plus className={`w-4 h-4 ${tab === "manual" ? "text-orange-500" : ""}`} />
            Manual Entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "voice" ? (
            <div className="flex flex-col items-center justify-center py-12 px-8 text-center min-h-[350px]">
              {isProcessing ? (
                <div className="flex flex-col items-center animate-in fade-in duration-500">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-orange-100 rounded-full" />
                    <div className="absolute inset-0 w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-orange-500 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">AI is Analyzing...</h3>
                  <p className="text-sm text-stone-500 mt-2">Crafting your task details from your voice.</p>
                </div>
              ) : (
                <>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 mb-6 ${isRecording ? "bg-red-50 scale-110 shadow-2xl shadow-red-100" : "bg-orange-50"}`}>
                    {isRecording ? (
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                        <Square className="w-8 h-8 text-red-500 relative z-10" />
                      </div>
                    ) : (
                      <Mic className="w-10 h-10 text-orange-500" />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-stone-900">
                    {isRecording ? "Listening..." : "Tell me your task"}
                  </h3>
                  <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
                    {isRecording 
                      ? "I'm listening. Say things like 'Buy groceries tomorrow at 5pm'." 
                      : "Tap the button below and describe what you want to do."}
                  </p>

                  {isRecording && (
                    <div className="mt-6 font-mono text-2xl font-bold text-red-500 animate-pulse">
                      {formatTime(recordingTime)}
                    </div>
                  )}

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`mt-10 px-10 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 ${
                      isRecording 
                        ? "bg-stone-900 text-white hover:bg-black shadow-stone-200" 
                        : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200"
                    }`}
                  >
                    {isRecording ? "Stop & Process" : "Start Recording"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="px-6 py-6 space-y-6">
              {/* Form Content */}
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Task Title</p>
                  <input
                    autoFocus value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="What do you need to do?"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-base font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Category</p>
                    <CategorySelect value={catId} onChange={setCatId} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Priority</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {PRIS.map(p => {
                        const active = pri === p;
                        return (
                          <button
                            key={p} onClick={() => setPri(p)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${active ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"}`}
                          >
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Due Date</p>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Time</p>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      <input type="time" value={time} onChange={e => setTime(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                    </div>
                  </div>
                </div>

                {date && time && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Reminder</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { val: -1, label: "None" },
                        { val: 0,  label: "At time" },
                        { val: 10, label: "10m before" },
                        { val: 30, label: "30m before" }
                      ].map(r => (
                        <button
                          key={r.val} onClick={() => setReminder(r.val)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${reminder === r.val ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"}`}
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
                    className="flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors bg-orange-50 px-3 py-2 rounded-xl"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                    {showDetails ? "Simple view" : "Advanced details"}
                  </button>
                  
                  {showDetails && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Description</p>
                        <textarea
                          value={desc} onChange={e => setDesc(e.target.value)}
                          placeholder="Add more context..." rows={3}
                          className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2 px-1">
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Attachments</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                          >
                            <UploadCloud className="w-3.5 h-3.5" /> Upload Image
                          </button>
                          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                        </div>
                        
                        {images.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {images.map((img, i) => (
                              <div key={i} className="group relative aspect-video rounded-xl border border-stone-200 overflow-hidden bg-stone-100">
                                <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-stone-400 font-bold uppercase py-4 border-2 border-dashed border-stone-100 rounded-2xl flex flex-col items-center justify-center">
                            No images attached
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-stone-200 text-sm font-bold text-stone-500 hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 py-3.5 rounded-2xl bg-stone-900 hover:bg-black text-sm font-bold text-white shadow-xl transition-all active:scale-[0.98]">
                  Confirm & Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
