import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { REALTIME_ENABLED, SOCKET_URL } from "./config";

/**
 * Shared Socket.IO client. `null` during SSR and when real-time updates are
 * disabled (see REALTIME_ENABLED), so every consumer must be null-safe.
 */
export const socket: Socket | null =
  typeof window !== "undefined" && REALTIME_ENABLED
    ? io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: false,
        reconnectionAttempts: 5,
      })
    : null;

export const connectSocket = () => {
  if (socket && !socket.connected) socket.connect();
};

export const emitSocket = (event: string, ...args: unknown[]) => {
  socket?.emit(event, ...args);
};

/**
 * Subscribe to server events for the lifetime of the component. When sockets
 * are unavailable the optional `fallbackIntervalMs` keeps data fresh by
 * calling the handler periodically instead.
 */
export const useSocketEvents = (
  events: string[],
  handler: () => void,
  fallbackIntervalMs = 30_000,
) => {
  useEffect(() => {
    if (!socket) {
      if (!fallbackIntervalMs) return;
      const timer = setInterval(handler, fallbackIntervalMs);
      return () => clearInterval(timer);
    }

    connectSocket();
    events.forEach((event) => socket.on(event, handler));
    return () => {
      events.forEach((event) => socket.off(event, handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join("|"), handler, fallbackIntervalMs]);
};
