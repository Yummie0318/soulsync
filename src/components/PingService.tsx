// src/components/PingService.tsx
"use client";

import { useEffect } from "react";

export default function PingService() {
  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (!stored) return; // not logged in
    const userId = Number(stored);

    const ping = async () => {
      try {
        await fetch("/api/users/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch (err) {
        console.error("Ping failed:", err);
      }
    };

    // First ping immediately
    ping();

    // Then ping every 30s
    const interval = setInterval(ping, 30000);

    return () => clearInterval(interval);
  }, []);

  return null; // invisible
}
