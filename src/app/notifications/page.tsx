"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Calendar, Inbox, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getAlerts } from "@/app/actions/notifications";
import MobileNav from "@/components/MobileNav";

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAlerts();
      setAlerts(data);
      setLoading(false);
    }
    load();
  }, []);

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
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-400 mt-4">Fetching your alerts...</p>
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Link 
                key={alert.id}
                href={`/?taskId=${alert.taskId}`}
                className="block p-4 bg-white border border-stone-200 rounded-2xl hover:border-orange-200 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.type === "OVERDUE" ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-bold text-stone-900 truncate">{alert.title}</p>
                      <span className="text-[10px] font-medium text-stone-400 whitespace-nowrap">
                        {format(new Date(alert.createdAt), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-2 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(alert.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-stone-300" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">No recent alerts</h3>
            <p className="text-sm text-stone-400 mt-1 max-w-xs">
              When you have upcoming tasks or overdue items, they will appear here.
            </p>
            <Link href="/" className="mt-6 px-6 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200">
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
