"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, Tag, User, Shield, Smartphone, ChevronRight, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const CategoryManager = dynamic(() => import("@/components/CategoryManager"), { ssr: false });

type Tab = "categories" | "notifications" | "account" /* | "display" */;

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id:"categories",    label:"Categories",    icon:Tag,        desc:"Manage task categories, colors, and reassignments" },
  { id:"notifications", label:"Notifications", icon:Bell,       desc:"Alert preferences and reminders" },
  { id:"account",       label:"Account",       icon:User,       desc:"Profile, email and password" },
  // { id:"display",       label:"Display",       icon:Smartphone, desc:"Theme, language and layout" },
];

/* ─── Placeholder sections ─────────────────── */
function NotificationsTab() {
  return (
    <div className="space-y-4">
      {[
        { label:"Daily summary", sub:"Get a recap of your tasks every morning at 8 AM", on:true },
        { label:"Overdue alerts", sub:"Remind me when tasks pass their due date", on:true },
        { label:"Upcoming reminders", sub:"Alert 1 hour before scheduled tasks", on:false },
        { label:"Weekly AI Summary", sub:"Receive AI-generated insights every Sunday", on:true },
      ].map(item => (
        <div key={item.label} className="flex items-start justify-between gap-4 p-4 bg-white border border-stone-200 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900">{item.label}</p>
            <p className="text-xs text-stone-400 mt-0.5">{item.sub}</p>
          </div>
          <button className={`relative w-10 h-5.5 rounded-full shrink-0 transition-colors mt-0.5 flex items-center ${item.on ? "bg-orange-500" : "bg-stone-200"}`} style={{ height:22, minWidth:40 }}>
            <span className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${item.on ? "translate-x-5" : "translate-x-0.5"}`}/>
          </button>
        </div>
      ))}
    </div>
  );
}

function AccountTab() {
  const [authProvider, setAuthProvider] = useState<"email" | "google">("email");

  return (
    <div className="space-y-3">
      {/* Mock toggle just for testing the UI */}
      <div className="flex gap-2 mb-2">
        <button onClick={() => setAuthProvider("email")} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${authProvider === "email" ? "bg-orange-500 text-white" : "bg-stone-200 text-stone-500 hover:bg-stone-300"}`}>Email Auth Demo</button>
        <button onClick={() => setAuthProvider("google")} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${authProvider === "google" ? "bg-orange-500 text-white" : "bg-stone-200 text-stone-500 hover:bg-stone-300"}`}>Google Auth Demo</button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-orange-600">H</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-stone-900">Harkirat</p>
          <p className="text-sm text-stone-400">harkirat@gmail.com</p>
        </div>
        <button className="text-xs font-semibold text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">Edit</button>
      </div>

      {authProvider === "google" ? (
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
          <p className="text-sm font-semibold text-stone-900">Change password</p>
          <p className="text-xs text-stone-500 mt-1">
            You are signed in securely via Google. Password changes are managed by your Google account.
          </p>
        </div>
      ) : (
        <button className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-xl transition-colors text-left">
          <div>
            <p className="text-sm font-semibold text-stone-900">Change password</p>
            <p className="text-xs text-stone-400 mt-0.5">Last changed 3 months ago</p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400"/>
        </button>
      )}

      {[
        { label:"Export data", sub:"Download all tasks as CSV or JSON" },
        { label:"Delete account", sub:"Permanently remove all data", danger:true },
      ].map(item => (
        <button key={item.label} className={`w-full flex items-center justify-between p-4 bg-white border rounded-xl transition-colors text-left ${(item as any).danger ? "border-red-100 hover:border-red-200 hover:bg-red-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}`}>
          <div>
            <p className={`text-sm font-semibold ${(item as any).danger ? "text-red-600" : "text-stone-900"}`}>{item.label}</p>
            <p className="text-xs text-stone-400 mt-0.5">{item.sub}</p>
          </div>
          <ChevronRight className={`w-4 h-4 ${(item as any).danger ? "text-red-400" : "text-stone-400"}`}/>
        </button>
      ))}
    </div>
  );
}

function DisplayTab() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-stone-200 rounded-xl">
        <p className="text-sm font-semibold text-stone-900 mb-3">Theme</p>
        <div className="flex gap-2">
          {["Light","Dark","System"].map((t, i) => (
            <button key={t} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${i===0?"border-orange-300 bg-orange-50 text-orange-700":"border-stone-200 text-stone-500 hover:bg-stone-50"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="p-4 bg-white border border-stone-200 rounded-xl">
        <p className="text-sm font-semibold text-stone-900 mb-3">Default view</p>
        <div className="flex gap-2">
          {["Table","Kanban","Week"].map((v, i) => (
            <button key={v} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${i===0?"border-orange-300 bg-orange-50 text-orange-700":"border-stone-200 text-stone-500 hover:bg-stone-50"}`}>{v}</button>
          ))}
        </div>
      </div>
      <div className="p-4 bg-white border border-stone-200 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-900">Compact mode</p>
          <p className="text-xs text-stone-400 mt-0.5">Show more tasks with smaller rows</p>
        </div>
        <button className="relative bg-stone-200 rounded-full flex items-center transition-colors" style={{ width:40, height:22 }}>
          <span className="absolute w-4 h-4 bg-white rounded-full shadow translate-x-0.5"/>
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  const tabContent = {
    categories:    <CategoryManager/>,
    notifications: <NotificationsTab/>,
    account:       <AccountTab/>,
    // display:       <DisplayTab/>,
  } as Record<Tab, JSX.Element>;

  const active = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Link href="/" className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 hover:bg-stone-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-stone-600"/>
          </Link>
          <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
            <Shield className="w-4 h-4 text-white" strokeWidth={2}/>
          </div>
          <div>
            <p className="text-base font-bold text-stone-900 leading-tight">Settings</p>
            <p className="text-[11px] text-stone-400 leading-none">{active.label}</p>
          </div>
        </div>
        {/* Mobile tab strip */}
        <div className="flex overflow-x-auto border-t border-stone-100 px-4 gap-0.5 pb-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-stone-500"
              }`}>
              <tab.icon className="w-3.5 h-3.5"/>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4 lg:py-8">
        {/* Desktop title */}
        <div className="hidden lg:block mb-7">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Settings</h1>
          <p className="text-sm text-stone-400 mt-1">Manage your workspace preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar nav */}
          <nav className="hidden lg:flex flex-col gap-1 w-52 shrink-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === tab.id ? "bg-orange-50 text-orange-700" : "text-stone-600 hover:bg-stone-100"
                }`}>
                <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? "text-orange-500" : "text-stone-400"}`} strokeWidth={activeTab === tab.id ? 2 : 1.75}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${activeTab === tab.id ? "text-orange-700" : "text-stone-700"}`}>{tab.label}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Content panel */}
          <div className="flex-1 min-w-0">
            {/* Section header (desktop only) */}
            <div className="hidden lg:block mb-5">
              <h2 className="text-lg font-bold text-stone-900">{active.label}</h2>
              <p className="text-sm text-stone-400 mt-0.5">{active.desc}</p>
            </div>

            <div className="pb-24 lg:pb-8">
              {tabContent[activeTab]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
