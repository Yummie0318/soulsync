"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Notification = { id: number; message: string };

type NotificationContextType = {
  notifications: Notification[];
  showNotification: (msg: string) => void;
  removeNotification: (id: number) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (msg: string) => {
    const id = Date.now();

    setNotifications((prev) => {
      const updated = [{ id, message: msg }, ...prev];
      return updated.slice(0, 2); // keep max 2
    });

    // ⏳ Auto-remove after 2 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 2000);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
