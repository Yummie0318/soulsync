"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ||
        "https://soulsync-socket-server.onrender.com",
      {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
        autoConnect: true,
      }
    );

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("🟢 [Socket] Connected:", socketInstance.id);
      setIsConnected(true);

      const userId =
        typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

      if (userId) {
        console.log(`👤 Joining user room: user:${userId}`);
        socketInstance.emit("joinUserRoom", userId);
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔴 [Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    socketInstance.on("reconnect_attempt", (attempt) => {
      console.log(`🔁 [Socket] Reconnect attempt #${attempt}`);
    });

    socketInstance.on("reconnect_failed", () => {
      console.warn("⚠️ [Socket] Reconnection failed after max attempts");
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useSocket must be used within a SocketProvider");
  return context;
};
