"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, Calendar, Layout, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fffcf9] text-stone-900 font-sans selection:bg-orange-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-200">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M5 12l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900">LifeOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors">Log in</Link>
            <Link href="/signup" className="px-5 py-2 rounded-xl bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold mb-6 border border-orange-100">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Voice-First Task Management
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-stone-900 leading-tight mb-6">
            Organize your life with <span className="text-orange-600">Voice.</span>
          </h1>
          <p className="text-lg lg:text-xl text-stone-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
            LifeOS is the ultimate personal assistant that combines AI-powered voice task creation with a premium, high-speed interface. Capture ideas as they happen.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-orange-600 text-white font-bold shadow-xl shadow-orange-200 hover:bg-orange-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              Start Organizing for Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all flex items-center justify-center">
              Login to Workspace
            </Link>
          </div>
        </div>
        <div className="flex-1 w-full max-w-xl lg:max-w-none">
          <div className="relative">
            <div className="absolute -inset-4 bg-orange-200/30 blur-3xl rounded-full" />
            <img 
              src="/hero.png" 
              alt="LifeOS Interface Preview" 
              className="relative rounded-3xl shadow-2xl border border-white/50"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white border-y border-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-stone-900 mb-4">Master your workflow</h2>
          <p className="text-stone-500 max-w-2xl mx-auto">Everything you need to manage tasks, schedules, and ideas in one high-performance OS.</p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Mic, title: "Voice Capturing", desc: "Just talk. Our AI understands deadlines, priorities, and categories automatically.", color: "bg-orange-50 text-orange-600" },
            { icon: Layout, title: "Dynamic Views", desc: "Switch between Kanban, Table, and Weekly views instantly to suit your working style.", color: "bg-blue-50 text-blue-600" },
            { icon: Calendar, title: "Smart Scheduling", desc: "Never miss a deadline with automatic date detection and intelligent reminders.", color: "bg-emerald-50 text-emerald-600" },
          ].map((feat, i) => (
            <div key={i} className="p-8 rounded-3xl bg-[#fffcf9] border border-orange-100 hover:shadow-xl hover:shadow-orange-100/50 transition-all group">
              <div className={`w-12 h-12 rounded-2xl ${feat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{feat.title}</h3>
              <p className="text-stone-500 leading-relaxed text-sm">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Verification Section */}
      <footer className="py-12 bg-[#fffcf9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-orange-100 pt-12">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                <path d="M5 12l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-stone-900">LifeOS</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-stone-500">
            <Link href="/privacy" className="hover:text-orange-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-orange-600 transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-orange-600 transition-colors">Help Center</Link>
          </div>
          <p className="text-xs text-stone-400">© 2026 LifeOS Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
