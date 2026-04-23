"use client";
import { useState } from "react";
import { Mic, Save } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";

const entries = [
  { id:"n1", date:"Today", time:"8:32 AM", type:"JOURNAL", mood:"😊",
    content:"Had a productive morning. Completed the gym session which I've been skipping. Need to stay consistent with health tasks — going to block 7–8 AM every day.",
    tags:["morning","reflection"], linked:null },
  { id:"n2", date:"Today", time:"11:45 AM", type:"VOICE", mood:null,
    content:"Remind me to follow up with the loan officer about the EMI rescheduling — they said they'd call back by Friday.",
    tags:["loan","followup"], linked:"Home Loan EMI" },
  { id:"n3", date:"Yesterday", time:"9:15 PM", type:"JOURNAL", mood:"😔",
    content:"Feeling overwhelmed with the backlog. Decided to tackle loan tasks this week and defer home tasks to next week. Sunday review will help me plan better.",
    tags:["evening","planning"], linked:null },
  { id:"n4", date:"Yesterday", time:"3:00 PM", type:"TASK", mood:null,
    content:"Client needs presentation by Tuesday EOD, not Friday. Reprioritising immediately.",
    tags:["client","urgent"], linked:"Client Presentation" },
];

const typeStyle: Record<string, { label:string; badge:string; text:string }> = {
  JOURNAL: { label:"Journal",    badge:"bg-violet-50", text:"text-violet-700" },
  VOICE:   { label:"Voice Note", badge:"bg-amber-50",  text:"text-amber-700" },
  TASK:    { label:"Task Note",  badge:"bg-emerald-50",text:"text-emerald-700" },
};

const moods = ["😊","😔","😤","🤔","🎉"];

export default function NotesPage() {
  const [filter, setFilter] = useState("ALL");
  const [entry, setEntry]   = useState("");

  const visible = filter === "ALL" ? entries : entries.filter(e => e.type === filter);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-1">Capture thoughts, linked to tasks</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Journal</h1>
        </div>

        {/* Quick write box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm">
          <textarea
            value={entry} onChange={e => setEntry(e.target.value)}
            placeholder="What's on your mind? Press Ctrl+Enter to save…"
            rows={3}
            className="w-full text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none bg-transparent"
          />
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
            <div className="flex gap-1">
              {moods.map(m => (
                <button key={m} className="w-8 h-8 rounded-lg text-base hover:bg-slate-100 transition-colors flex items-center justify-center">{m}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors" title="Voice note">
                <Mic className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-4">
          {[{id:"ALL",label:"All"},{id:"JOURNAL",label:"📝 Journal"},{id:"VOICE",label:"🎙 Voice"},{id:"TASK",label:"📌 Task"}].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === f.id
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Entry list */}
        <div className="space-y-3">
          {visible.map(e => {
            const s = typeStyle[e.type];
            return (
              <div key={e.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge} ${s.text}`}>{s.label}</span>
                  {e.linked && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                      📌 {e.linked}
                    </span>
                  )}
                  {e.mood && <span className="text-base">{e.mood}</span>}
                  <span className="text-xs text-slate-400 ml-auto">{e.date} · {e.time}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-2.5">{e.content}</p>
                {e.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {e.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-20" />
      </div>
      <VoiceInputButton />
    </div>
  );
}
