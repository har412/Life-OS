"use client";
import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { getAlerts, markAlertAsRead, deleteAlert } from "@/app/actions/alerts";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchAlerts() {
    const data = await getAlerts();
    
    // If there's a new unread alert, show a browser notification
    if (data.length > 0 && !data[0].isRead) {
      const latestAlert = data[0];
      const storedLastId = localStorage.getItem("last_alert_id");
      
      if (latestAlert.id !== storedLastId) {
        if (Notification.permission === "granted") {
          new Notification(latestAlert.title, {
            body: latestAlert.message,
            icon: "/logo.png" // Replace with your actual icon path
          });
        }
        localStorage.setItem("last_alert_id", latestAlert.id);
      }
    }

    setAlerts(data);
    setUnreadCount(data.filter((a: any) => !a.isRead).length);
  }

  useEffect(() => {
    // Request permission for browser notifications
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    fetchAlerts();
    // In a real app, we might use Pusher or Ably for real-time
    const interval = setInterval(fetchAlerts, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markAlertAsRead(id);
    fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await deleteAlert(id);
    fetchAlerts();
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border-2 border-white" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">

            <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between bg-stone-50/50">
              <h3 className="text-sm font-bold text-stone-900">Notifications</h3>
              <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase">
                {unreadCount} Unread
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-stone-400">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 transition-colors ${alert.isRead ? 'opacity-60' : 'bg-orange-50/30'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm font-bold ${alert.isRead ? 'text-stone-700' : 'text-stone-900'}`}>
                          {alert.title}
                        </p>
                        <div className="flex items-center gap-1">
                          {!alert.isRead && (
                            <button 
                              onClick={() => handleMarkRead(alert.id)}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(alert.id)}
                            className="p-1 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed mb-2">
                        {alert.message}
                      </p>
                      <p className="text-[10px] text-stone-400 font-medium">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
