// src/app/RootClient.tsx
"use client";

import { NotificationProvider } from "@/context/NotificationContext";
import NotificationContainer from "@/components/NotificationContainer";
import PingService from "@/components/PingService";
import CallListener from "@/components/CallListener";

export default function RootClient({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <NotificationContainer />
      {children}
      <PingService />       {/* ✅ heartbeat / background updates */}
      <CallListener />     {/* ✅ handles incoming call popup */}
    </NotificationProvider>
  );
}
