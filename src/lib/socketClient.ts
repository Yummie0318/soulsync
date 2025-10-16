// src/lib/socketClient.ts
import { io } from "socket.io-client";

const socket = io(
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://soulsync-socket-server.onrender.com",
  {
    transports: ["websocket"],
    path: "/socket.io",
    autoConnect: false,
  }
);

export default socket;
