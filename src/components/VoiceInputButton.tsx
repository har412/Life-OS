"use client";
import { useState } from "react";
import { Mic, Pause, Check, Pencil } from "lucide-react";

export default function VoiceInputButton() {
  const [listening,setListening] = useState(false);
  const [toast,setToast]         = useState(false);
  function toggle(){
    if(listening){setListening(false);setToast(true);setTimeout(()=>setToast(false),5000);}
    else setListening(true);
  }
  return (
    <>
      {toast&&(
        <div className="fixed bottom-24 right-4 lg:right-6 w-72 bg-white border border-stone-200 rounded-2xl shadow-lg p-4 z-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5}/></div>
            <p className="text-xs font-semibold text-emerald-700">Task understood</p>
          </div>
          <p className="text-sm font-medium text-stone-800 mb-3">"Pay home loan EMI tomorrow at 11am"</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[["📅","Tomorrow"],["🏦","Loan"],["🔴","Urgent"],["⏰","11:00 AM"]].map(([icon,val])=>(
              <span key={val} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-stone-100 text-stone-600">{icon} {val}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-semibold text-white transition-colors">Save</button>
            <button className="flex-1 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-1"><Pencil className="w-3 h-3"/>Edit</button>
          </div>
        </div>
      )}
      {listening&&(
        <div className="fixed bottom-24 right-4 lg:right-6 flex items-center gap-2.5 bg-white border border-stone-200 rounded-xl px-4 py-2.5 shadow-md z-50">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
          <p className="text-sm text-stone-700">Listening…</p>
        </div>
      )}
      <button onClick={toggle}
        className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center z-50 shadow-lg transition-all active:scale-95 ${
          listening?"bg-red-500 hover:bg-red-600 shadow-red-200 animate-pulse":"bg-orange-500 hover:bg-orange-600 shadow-orange-200"
        }`}>
        {listening?<Pause className="w-5 h-5 text-white"/>:<Mic className="w-5 h-5 text-white"/>}
      </button>
    </>
  );
}
