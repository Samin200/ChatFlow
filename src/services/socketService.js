import { io } from "socket.io-client";
import { getAuthToken } from "./storageService.js";

let socket = null;

export function connectSocket(token) {
  const authToken = token || getAuthToken();
  if (!authToken) return null;

  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(import.meta.env.VITE_WS_URL, {
    auth: { token: authToken },
    transports: ["websocket"],
  });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

export function emitSocketEvent(event, payload) {
  if (!socket) return;
  socket.emit(event, payload);
}

export function subscribeSocketEvent(event, cb) {
  if (!socket || typeof cb !== "function") return () => {};
  socket.on(event, cb);
  return () => {
    if (!socket) return;
    socket.off(event, cb);
  };
}
