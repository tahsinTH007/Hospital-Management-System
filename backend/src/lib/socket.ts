import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { ALLOWED_ORIGINS } from "../config/env.ts";

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_role_room", (role) =>
      socket.join(role === "admin" ? "admin_room" : "medical_room"),
    );
    // A client created a user: tell every connected client (including the
    // sender) so their lists refresh.
    socket.on("notify_user_created", () => {
      io?.emit("notify_user_created");
    });
  });
  return io;
};

/**
 * Returns the Socket.IO server, or null when the API runs without a
 * long-lived server (e.g. as a Vercel Function). Callers must treat null as
 * "real-time updates unavailable" – the frontend falls back to polling.
 */
export const getIO = () => io;
