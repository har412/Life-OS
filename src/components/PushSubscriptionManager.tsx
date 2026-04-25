"use client";

import { useEffect, useState } from "react";
import { saveSubscription } from "@/app/actions/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function PushSubscriptionManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
  }

  async function subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permission not granted for notifications");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });

      // Save to server
      const res = await saveSubscription(JSON.parse(JSON.stringify(subscription)));
      if (res.success) {
        setIsSubscribed(true);
        console.log("✅ Subscribed to push notifications");
      }
    } catch (error) {
      console.error("❌ Failed to subscribe to push:", error);
    }
  }

  if (!isSupported) return null;

  return (
    <div className="p-4 bg-stone-100 rounded-lg border border-stone-200 mt-4">
      <h3 className="font-medium text-stone-900 mb-1 text-sm">Mobile Notifications</h3>
      <p className="text-xs text-stone-500 mb-3">
        Get alerts on your phone even when the app is closed.
      </p>
      
      {!isSubscribed ? (
        <button
          onClick={subscribeToPush}
          className="w-full py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
        >
          Enable Push Notifications
        </button>
      ) : (
        <div className="text-xs text-green-600 flex items-center gap-1 font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Active on this device
        </div>
      )}
    </div>
  );
}
