"use client";

import { NotificationProvider } from "@/context/NotificationContext";
import NotificationContainer from "@/components/NotificationContainer";
import PingService from "@/components/PingService";
import { SocketProvider } from "@/context/SocketContext";
import CallHandler from "@/components/CallHandler"; // ✅ new unified call system

export default function RootClient({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <NotificationProvider>
        <NotificationContainer />
        {children}
        <PingService />

        {/* ✅ Global incoming call listener + popup */}
        <CallHandler />
      </NotificationProvider>
    </SocketProvider>
  );
}
