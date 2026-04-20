/*
 * NovaLink Service Worker
 * Handles background push notifications.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "New message received",
      icon: "/favicon.ico", // Ensure this exists or use a generic icon
      badge: "/favicon.ico",
      tag: data.tag || "novalink-notification",
      data: data.data || {},
      vibrate: [100, 50, 100],
      actions: [
        { action: "open", title: "Open App" },
        { action: "close", title: "Dismiss" }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "NovaLink", options)
    );
  } catch (err) {
    console.error("Error receiving push notification", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  // Open the app or focus the current window
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes("/") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
