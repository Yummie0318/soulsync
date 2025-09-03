// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationContainer from "@/components/NotificationContainer";

export const metadata: Metadata = {
  title: "SoulSync AI",
  description: "AI-Powered Dating App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          {/* Global Notifications (always visible) */}
          <NotificationContainer />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
