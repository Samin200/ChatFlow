import api from "./api.js";

const VAPID_PUBLIC_KEY = "BK72WwV-RLZgPKJUvX9fXau4kXhYqQxBCJ71tUcMxGFgg7GqlnLeLJCb0XVCydbXWOH0zRnZJwDtITPmlEydWPw";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications are not supported in this browser.");
    return;
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied.");
      return;
    }

    // 3. Subscribe to Push Manager
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // 4. Send subscription to backend
    await api.post("/api/notifications/subscribe", {
      subscription,
      deviceId: navigator.userAgent // Simple device identifier
    });

    console.log("Push notifications registered successfully.");
  } catch (err) {
    console.error("Failed to register push notifications", err);
  }
}
