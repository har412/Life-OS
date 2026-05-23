"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Mic, Calendar, Layout,
  ShieldCheck, Terminal, Sparkles, Lock, Play,
  Server
} from "lucide-react";

export default function LandingPage() {
  // Interactive Voice AI Simulator State
  const [simStatus, setSimStatus] = useState<"idle" | "listening" | "processing" | "done">("idle");
  const [simTranscript, setSimTranscript] = useState("");
  const [simTasks, setSimTasks] = useState([
    { id: 1, title: "🚀 Setup production environment", category: "DevOps", priority: "HIGH", date: "Today" },
    { id: 2, title: "🔒 Configure SSH tunnels keepalive", category: "Dev", priority: "MEDIUM", date: "Today" },
  ]);

  const runSimulation = () => {
    if (simStatus !== "idle") return;
    
    // Step 1: Listening
    setSimStatus("listening");
    setSimTranscript("");
    
    let charIndex = 0;
    const fullText = "Create an urgent task to record the LinkedIn promotional video by tomorrow under marketing category";
    
    setTimeout(() => {
      const interval = setInterval(() => {
        setSimTranscript(prev => prev + fullText[charIndex]);
        charIndex++;
        if (charIndex >= fullText.length - 1) {
          clearInterval(interval);
          
          // Step 2: Processing
          setTimeout(() => {
            setSimStatus("processing");
            
            // Step 3: Done + Inject Task
            setTimeout(() => {
              setSimStatus("done");
              setSimTasks(prev => [
                {
                  id: 3,
                  title: "🎥 Record LinkedIn Promo Video",
                  category: "Marketing",
                  priority: "URGENT",
                  date: "Tomorrow"
                },
                ...prev
              ]);
            }, 1800);
            
          }, 1000);
        }
      }, 35);
    }, 800);
  };

  const resetSimulation = () => {
    setSimStatus("idle");
    setSimTranscript("");
    setSimTasks([
      { id: 1, title: "🚀 Setup production environment", category: "DevOps", priority: "HIGH", date: "Today" },
      { id: 2, title: "🔒 Configure SSH tunnels keepalive", category: "Dev", priority: "MEDIUM", date: "Today" },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#fffcf9] text-stone-900 font-sans selection:bg-orange-200">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-orange-100/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-orange-200 flex items-center justify-center bg-orange-650">
              <svg viewBox="0 0 36 36" fill="none" className="w-5 h-5 animate-pulse">
                <rect width="36" height="36" rx="9" fill="#EA580C"/>
                <rect x="9" y="10.5" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.35"/>
                <path d="M19 11.5L21 13.5L25.5 9" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="9" y="17" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.65"/>
                <path d="M19 18L21 20L25.5 15.5" stroke="white" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="9" y="23.5" width="7" height="1.75" rx="0.875" fill="white"/>
                <path d="M19 24.5L21 26.5L25.5 22" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-stone-900 uppercase">Life<span className="text-orange-600">OS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-extrabold uppercase tracking-wider text-stone-500 hover:text-stone-950 transition-colors">Log in</Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-100 hover:bg-orange-600 transition-all cursor-pointer">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Header Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 overflow-hidden">
        <div className="flex-1 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-black uppercase tracking-widest mb-6 border border-orange-500/20 animate-pulse">
            <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-ping shrink-0" />
            Next-Gen Personal Productivity
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-stone-900 leading-[1.1] mb-6 tracking-tight">
            Organize your <br />
            workflow with <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">Voice AI.</span>
          </h1>
          <p className="text-base lg:text-lg text-stone-500 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
            Capture naturally spoken task dumps, automatically categorize priorities, synchronize with GitHub issues, and manage SSH tunnels—all in one high-performance interface.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-orange-500 text-white font-extrabold text-sm shadow-lg shadow-orange-500/35 hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer group">
              Get Workspace Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-stone-200 text-stone-600 font-extrabold text-sm hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center justify-center cursor-pointer">
              Access Dashboard
            </Link>
          </div>
        </div>

        {/* Live CSS Interactive Mockup Showcase */}
        <div className="flex-1 w-full max-w-2xl relative z-10">
          <div className="absolute -inset-4 bg-gradient-to-tr from-orange-500/20 to-amber-500/10 blur-3xl rounded-3xl" />
          <div className="relative rounded-3xl bg-stone-950 border border-stone-850 p-4 sm:p-5 shadow-2xl shadow-stone-950/80 animate-in fade-in zoom-in-95 duration-500">
            {/* Mockup Header bar */}
            <div className="flex items-center justify-between border-b border-stone-900 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                <span className="text-[10px] text-stone-500 font-mono ml-2">life-os.local/workspace</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 rounded-lg text-[9px] text-orange-400 font-extrabold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Live Simulator
              </div>
            </div>

            {/* Interactive simulator controls */}
            <div className="mb-4 bg-stone-900/50 rounded-2xl p-4 border border-stone-850 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-bold text-stone-200">🎙️ Live AI Voice Dictator</p>
                <p className="text-[10px] text-stone-400 mt-1 leading-normal">Click play to watch our AI listen, transcribe, and schedule tasks in real-time.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {simStatus === "idle" ? (
                  <button
                    onClick={runSimulation}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-950/40"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Try Demo
                  </button>
                ) : (
                  <button
                    onClick={resetSimulation}
                    className="px-4 py-2 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Reset Board
                  </button>
                )}
              </div>
            </div>

            {/* Simulator Output Waves & Transcript */}
            {(simStatus === "listening" || simStatus === "processing") && (
              <div className="mb-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">
                      {simStatus === "listening" ? "Listening & Dictating" : "AI Processing Engine..."}
                    </span>
                  </div>
                  <div className="flex gap-1 h-3 items-end">
                    {[0.6, 1, 0.4, 0.9, 0.5, 0.8, 0.3].map((h, idx) => (
                      <span
                        key={idx}
                        className={`w-[2px] bg-orange-500 rounded-full ${simStatus === "listening" ? "animate-bounce" : "animate-pulse"}`}
                        style={{ height: `${h * 12}px`, animationDelay: `${idx * 100}ms` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="font-mono text-xs text-stone-300 border border-stone-850 bg-stone-950/90 rounded-lg p-2.5 min-h-[48px] leading-relaxed select-none">
                  {simTranscript || <span className="text-stone-600 italic">Listening to audio stream...</span>}
                  {simStatus === "processing" && (
                    <span className="inline-block w-1.5 h-3.5 bg-orange-500 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            )}

            {/* Task list simulation view */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-stone-500 tracking-wider">Simulated Task Board</p>
              <div className="grid grid-cols-1 gap-2.5">
                {simTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 bg-stone-900 border rounded-xl flex items-center justify-between gap-4 transition-all duration-300 ${
                      t.id === 3
                        ? "border-orange-500 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.15)] animate-in slide-in-from-top-4 duration-500"
                        : "border-stone-850"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-stone-800 text-stone-300 border border-stone-750">
                          {t.category}
                        </span>
                        {t.priority === "URGENT" && (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/25">
                            Urgent
                          </span>
                        )}
                        {t.priority === "HIGH" && (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/25">
                            High
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-100 font-bold mt-1.5 truncate">{t.title}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-stone-500 flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-stone-600" /> {t.date}
                      </span>
                      <span className="w-5 h-5 rounded-full bg-stone-850 border border-stone-700 flex items-center justify-center text-[10px] text-stone-400 font-bold">
                        ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Features Grid */}
      <section className="py-24 bg-white border-y border-orange-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-black text-stone-900 mb-4 tracking-tight">Master your daily flow</h2>
          <p className="text-stone-500 max-w-xl mx-auto text-sm font-medium">A unified hub offering powerful tools built for quick captures, robust views, and secure coding environments.</p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Mic,
              title: "Omni Voice Commander",
              desc: "Dictate naturally. Our AI extracts structured titles, descriptions, due dates, priorities, and labels instantly with real-time UI previews.",
              badge: "Voice-First",
            },
            {
              icon: Layout,
              title: "Interactive Kanban Multi-Views",
              desc: "Toggle instantly between Kanban columns, chronological Table grids, and weekly planners. Fully optimized for high-speed desktop/mobile navigation.",
              badge: "Flexible UI",
            },
            {
              icon: Terminal,
              title: "Secure Developer Hub",
              desc: "Direct PTY shell client with active keepalive connections, floating voice FAB controls, and repository GitHub issue context management.",
              badge: "DevOps ready",
            },
            {
              icon: ShieldCheck,
              title: "FileSystem Sandbox Reviewer",
              desc: "Browse generated workspace code and terminal outputs securely. Review changes through our file sandbox before executing commands.",
              badge: "Security",
            },
            {
              icon: Lock,
              title: "SMTP Auth & Local Upgrades",
              desc: "Safe session management powered by NextAuth. Features SMTP email verification, forgot-password loops, and credential upgrades for OAuth accounts.",
              badge: "Access Lock",
            },
            {
              icon: Server,
              title: "QStash Scheduled Alerts",
              desc: "Never miss a deadline. Integrates with Upstash QStash to process background email digests and mobile push alerts dynamically.",
              badge: "Alerts System",
            },
          ].map((feat, i) => (
            <div key={i} className="p-8 rounded-3xl bg-[#fffcf9] border border-orange-100/80 hover:shadow-xl hover:shadow-orange-150/40 transition-all duration-300 group flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feat.icon className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-orange-50 text-orange-600 rounded border border-orange-100">
                  {feat.badge}
                </span>
              </div>
              <h3 className="text-lg font-black text-stone-900 mb-3">{feat.title}</h3>
              <p className="text-stone-500 leading-relaxed text-xs font-medium flex-1">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Video Reel Promotional Ideas Prep Segment */}
      <section className="py-24 bg-[#fffcf9] overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl lg:text-5xl font-black text-stone-900 mb-6 tracking-tight">Built for Creators & Engineers</h2>
          <p className="text-base text-stone-500 mb-12 max-w-xl mx-auto font-medium leading-relaxed">
            Record clean, eye-catching promotional reels for LinkedIn. Show off the instant voice AI creation, quick weekly planners, and the robust sandboxed DevPortal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-white/70 border border-orange-100/60 rounded-2xl backdrop-blur-sm shadow-sm">
              <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">Reel Idea #1</h4>
              <p className="text-xs font-bold text-stone-800 mb-2">🎤 Voice-to-Board Speedrun</p>
              <p className="text-[10px] text-stone-500 leading-relaxed">Show yourself clicking the FAB, saying a complex schedule string, and seeing AI instant extraction form into cards instantly.</p>
            </div>
            <div className="p-6 bg-white/70 border border-orange-100/60 rounded-2xl backdrop-blur-sm shadow-sm">
              <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">Reel Idea #2</h4>
              <p className="text-xs font-bold text-stone-800 mb-2">💻 Secure DevOps Control</p>
              <p className="text-[10px] text-stone-500 leading-relaxed">Film the SSH keepalive terminal running commands alongside the sandbox reader and the popped-out floating Voice Mic button.</p>
            </div>
            <div className="p-6 bg-white/70 border border-orange-100/60 rounded-2xl backdrop-blur-sm shadow-sm">
              <h4 className="text-xs font-bold text-stone-800 mb-2">📱 Smooth Mobile Swipe</h4>
              <p className="text-[10px] text-stone-500 leading-relaxed">Demonstrate mobile touch navigation, showing grab-handle drag-and-drop kanbans maintaining smooth scrolling boundaries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding Segment */}
      <footer className="py-12 bg-white border-t border-orange-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-orange-650 animate-pulse">
              <svg viewBox="0 0 36 36" fill="none" className="w-3.5 h-3.5">
                <rect width="36" height="36" rx="9" fill="#EA580C"/>
                <rect x="9" y="10.5" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.35"/>
                <path d="M19 11.5L21 13.5L25.5 9" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="9" y="17" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.65"/>
                <path d="M19 18L21 20L25.5 15.5" stroke="white" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="9" y="23.5" width="7" height="1.75" rx="0.875" fill="white"/>
                <path d="M19 24.5L21 26.5L25.5 22" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-black tracking-tight text-stone-900 uppercase">Life<span className="text-orange-600">OS</span></span>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-stone-400 uppercase tracking-wider">
            <Link href="/privacy" className="hover:text-orange-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-orange-600 transition-colors">Terms</Link>
            <Link href="/" className="hover:text-orange-600 transition-colors">Help</Link>
          </div>
          <p className="text-xs text-stone-400">© 2026 LifeOS Assistant. Crafted with extreme premium care.</p>
        </div>
      </footer>
    </div>
  );
}
