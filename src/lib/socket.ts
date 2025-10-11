// src/lib/socket.ts
// ✅ Client-side socket helper (for Next.js frontend only)
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://soulsync-socket-server.onrender.com";

// ✅ Create a socket instance with improved stability
const socket: Socket = io(SOCKET_URL, {
  path: "/socket.io", // important for Render deployment
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 10000,
  autoConnect: false, // control connection manually
  forceNew: false,
});

// ✅ Log connection status for easier debugging
socket.on("connect", () => {
  console.log("🟢 [lib/socket] Connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 [lib/socket] Disconnected:", reason);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log(`🔁 [lib/socket] Reconnect attempt #${attempt}`);
});

socket.on("reconnect_failed", () => {
  console.warn("⚠️ [lib/socket] Reconnection failed after max attempts");
});

export default socket;
