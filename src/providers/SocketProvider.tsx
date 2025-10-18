"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNotification } from "@/context/NotificationContext";

// ======================================================
// 🧩 Context
// ======================================================
const SocketContext = createContext<Socket | null>(null);
export const useSocket = () => useContext(SocketContext);

// ======================================================
// ⚙️ Provider
// ======================================================
export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { showNotification } = useNotification();

  // ======================================================
  // 🪵 Pro Logger
  // ======================================================
  const log = (label: string, data?: any, color: string = "lightgreen") => {
    const ts = new Date().toLocaleTimeString();
    console.log(`%c[🧩 SocketProvider ${ts}] ${label}`, `color:${color};font-weight:bold;`, data ?? "");
  };

  // ======================================================
  // 🚀 Initialize Socket
  // ======================================================
  useEffect(() => {
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL || "https://soulsync-socket-server.onrender.com";

    log("🌍 Connecting to Socket.IO server...", { url: SOCKET_URL }, "deepskyblue");

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    setSocket(s);

    // ======================================================
    // 🟢 Connected
    // ======================================================
    s.on("connect", () => {
      log("✅ Connected to server", { socketId: s.id });
      showNotification("🟢 Connected to call server");

      const userId = localStorage.getItem("user_id");
      if (userId) {
        // 🧠 FIX: Send only the numeric ID (backend adds the "user:" prefix)
        log("👤 Joining user room", { userId });
        s.emit("joinUserRoom", userId);
      } else {
        log("⚠️ No user_id found in localStorage — cannot join room", null, "orange");
      }
    });

    // ======================================================
    // ⚪ Disconnected
    // ======================================================
    s.on("disconnect", (reason) => {
      log("⚪ Disconnected", { reason }, "gray");
      showNotification("⚪ Disconnected from call server");
    });

    // ======================================================
    // 🔴 Connection Error
    // ======================================================
    s.on("connect_error", (err) => {
      log("🔴 Connection error", { message: err.message, stack: err.stack }, "red");
      showNotification("🔴 Socket connection failed");
    });

    // ======================================================
    // 📡 Universal Event Debug
    // ======================================================
    s.onAny((event, ...args) => {
      log(`📡 Event received → ${event}`, args, "cyan");
    });

    // ======================================================
    // 🧹 Cleanup
    // ======================================================
    return () => {
      log("🧹 Cleaning up socket before unmount");
      s.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
