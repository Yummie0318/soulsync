"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ||
        "https://soulsync-socket-server.onrender.com",
      {
        transports: ["websocket"],
      }
    );

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("🟢 [Socket] Connected:", socketInstance.id);
    });

    socketInstance.on("disconnect", () => {
      console.log("🔴 [Socket] Disconnected");
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
};
