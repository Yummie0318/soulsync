// src/lib/socket.ts
// client-side socket helper (do NOT import from server code)
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://soulsync-socket-server.onrender.com";

// We use autoConnect: false so we control when to connect (helps in Next.js).
const socket: Socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});

export default socket;
