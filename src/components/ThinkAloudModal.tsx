"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2, Sparkles, Plus, Check, Calendar, Tag, AlertTriangle } from "lucide-react";
import { useView } from "@/lib/viewContext";

interface ProposedTask {
  title: string;
  description: string;
  dueDate: string | null;
  time: string | null;
  categoryId: string;
  priority: string;
}

export default function ThinkAloudModal({ onClose }: { onClose: () => void }) {
  const { allCategories, addTask } = useView();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
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
    setProposedTasks([]);
    
    try {
      const formData = new FormData();
      formData.append("audio", blob);

      const response = await fetch("/api/ai/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to process audio");
      }

      const data = await response.json();
      setTranscript(data.transcript);
      setProposedTasks(data.tasks);
    } catch (err: any) {
      console.error("❌ Processing error:", err);
      alert(err.message || "An error occurred while processing your recording.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTask = async (task: ProposedTask) => {
    await addTask(task);
    setProposedTasks(prev => prev.filter(t => t !== task));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddAll = async () => {
    setSavingAll(true);
    for (const task of proposedTasks) {
      await addTask(task);
    }
    setProposedTasks([]);
    setSavingAll(false);
  };

  const [savingAll, setSavingAll] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onClose}/>
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Think Aloud AI</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-xl transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {proposedTasks.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? "bg-red-50 scale-110 shadow-2xl shadow-red-100" : "bg-purple-50"}`}>
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                    <Square className="w-8 h-8 text-red-500 relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-10 h-10 text-purple-500" />
                )}
              </div>
              
              <h3 className="mt-6 text-xl font-bold text-stone-900">
                {isRecording ? "Listening to your thoughts..." : "Ready to listen"}
              </h3>
              <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
                {isRecording 
                  ? "Talk freely. Describe your tasks, dates, and ideas. I'll figure it all out." 
                  : "Click the button and speak for as long as you want. I'll extract your tasks automatically."}
              </p>

              {isRecording && (
                <div className="mt-6 font-mono text-2xl font-bold text-red-500 animate-pulse">
                  {formatTime(recordingTime)}
                </div>
              )}

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`mt-10 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 ${
                  isRecording 
                    ? "bg-stone-900 text-white hover:bg-black" 
                    : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                }`}
              >
                {isRecording ? "Stop & Process" : "Start Thinking Aloud"}
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-purple-100 rounded-full" />
                <div className="absolute inset-0 w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-500 animate-pulse" />
              </div>
              <h3 className="mt-8 text-lg font-bold text-stone-900">AI is Analyzing...</h3>
              <p className="mt-2 text-sm text-stone-500">Extracting tasks, dates, and priorities from your recording.</p>
            </div>
          )}

          {proposedTasks.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                <p className="text-xs font-bold text-stone-400 uppercase mb-2">Transcript Summary</p>
                <p className="text-sm text-stone-600 italic">"{transcript}"</p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  Extracted Tasks <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-[10px]">{proposedTasks.length} Found</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setProposedTasks([])}
                    className="text-[10px] font-bold uppercase text-stone-400 hover:text-red-500 transition-colors"
                  >
                    Discard All
                  </button>
                  <button 
                    onClick={handleAddAll}
                    disabled={savingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold uppercase hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {savingAll ? "Adding..." : <><Plus className="w-3 h-3" /> Add All</>}
                  </button>
                </div>
              </div>
                <div className="space-y-3">
                  {proposedTasks.map((task, i) => (
                    <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4 hover:border-purple-300 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-stone-400">
                            <Calendar className="w-3 h-3" /> {task.dueDate || "No date"}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-stone-400">
                            <Tag className="w-3 h-3" /> {task.categoryId}
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${
                            task.priority === 'URGENT' ? 'text-red-500' : 'text-orange-500'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddTask(task)}
                        className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all shadow-sm active:scale-90"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button 
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-bold hover:bg-black transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
