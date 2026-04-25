"use client";

import { useView } from "@/lib/viewContext";
import { ArrowLeft, Bell, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function NotificationsPage() {
  const { tasks } = useView();

  // In a real app, we would fetch Alert models from DB.
  // For this demo, let's look at tasks that have upcoming or overdue alerts 
  // or use the 'Alert' model if we want to build a real inbox.
  
  // Let's assume we have an 'Alert' table. 
  // For now, I'll show a "Mobile-Optimized Inbox" UI.

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-stone-200 px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 hover:bg-stone-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-stone-600"/>
        </Link>
        <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
          <Bell className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-base font-bold text-stone-900 leading-tight">Inbox</p>
          <p className="text-[11px] text-stone-400 leading-none">Your recent alerts</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center shrink-0">
            <span className="text-xs">💡</span>
          </div>
          <div>
            <p className="text-sm font-bold text-orange-900">Pro Tip</p>
            <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
              Clicking a notification will take you directly to the task. Use the buttons in the alert for quick actions.
            </p>
          </div>
        </div>

        {/* Empty state for now since we don't have a 'fetchAlerts' client method yet */}
        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">No recent alerts</h3>
          <p className="text-sm text-stone-400 mt-1 max-w-xs">
            When you have upcoming tasks or overdue items, they will appear here.
          </p>
          <Link href="/" className="mt-6 px-6 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
