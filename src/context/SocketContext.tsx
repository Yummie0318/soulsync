"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinUserRoom: (userId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ||
        "https://soulsync-socket-server.onrender.com",
      {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      }
    );

    setSocket(socketInstance);

    // --- Connection events ---
    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("🟢 [Socket] Connected:", socketInstance.id);

      // Rejoin room if userId was already set
      if (userId) {
        console.log("🔁 [Socket] Rejoining user room:", userId);
        socketInstance.emit("join-user-room", { userId });
      }
    });

    socketInstance.io.on("reconnect", (attempt) => {
      console.log(`♻️ [Socket] Reconnected (attempt ${attempt})`);
      if (userId) {
        console.log("🔁 [Socket] Rejoining after reconnect:", userId);
        socketInstance.emit("join-user-room", { userId });
      }
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      console.warn("🔴 [Socket] Disconnected:", reason);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);

  // --- Function to join user room manually ---
  const joinUserRoom = (id: string) => {
    if (!socket) return;
    console.log("👤 [Socket] Joining user room:", id);
    setUserId(id);
    socket.emit("join-user-room", { userId: id });
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinUserRoom }}>
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
