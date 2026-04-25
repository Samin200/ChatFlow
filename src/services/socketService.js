import { io } from "socket.io-client";
import { getAuthToken } from "./storageService.js";

let socket = null;
const eventRegistry = new Map(); // event -> Set of callbacks

export function connectSocket(token) {
  const authToken = token || getAuthToken();
  if (!authToken) return null;

  if (socket) {
    if (socket.connected) return socket;
    socket.connect();
    return socket;
  }

  socket = io(import.meta.env.VITE_WS_URL, {
    auth: { token: authToken },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected, re-applying listeners...");
    
    // Explicitly authenticate to join user room
    const user = JSON.parse(localStorage.getItem('nChatFlow_user') || '{}');
    const userId = user.id;
    console.log("[DEBUG-SOCKET] Auth check: userId =", userId);
    if (userId) {
      console.log("[DEBUG-SOCKET] Emitting 'authenticate' for", userId);
      socket.emit('authenticate', userId);
    }

    // Re-apply all registered listeners on every connection
    eventRegistry.forEach((callbacks, event) => {
      socket.off(event); // Avoid duplicates
      callbacks.forEach((cb) => socket.on(event, cb));
    });
  });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  // We keep eventRegistry so they re-attach if we reconnect
}

export function emitSocketEvent(event, payload) {
  if (!socket) {
      // Auto-connect if trying to emit
      connectSocket();
  }
  if (socket) socket.emit(event, payload);
}

export function subscribeSocketEvent(event, cb) {
  if (typeof cb !== "function") return () => {};

  // Register in our persistent registry
  if (!eventRegistry.has(event)) {
    eventRegistry.set(event, new Set());
  }
  eventRegistry.get(event).add(cb);

  // If socket is already connected, attach immediately
  if (socket) {
    socket.on(event, cb);
  }

  return () => {
    if (eventRegistry.has(event)) {
      eventRegistry.get(event).delete(cb);
    }
    if (socket) {
      socket.off(event, cb);
    }
  };
}
