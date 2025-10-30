"use client";

import { ReactNode } from "react";
import { NotificationProvider } from "@/context/NotificationContext";
import PingService from "@/components/PingService";
import { SocketProvider } from "@/providers/SocketProvider";
import IncomingCallPopup from "@/components/global/IncomingCallPopup";
import NotificationContainer from "@/components/NotificationContainer"; // ✅ import

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <SocketProvider>
        {children}
        <PingService />
        <IncomingCallPopup />
        <NotificationContainer /> {/* ✅ add this */}
      </SocketProvider>
    </NotificationProvider>
  );
}
