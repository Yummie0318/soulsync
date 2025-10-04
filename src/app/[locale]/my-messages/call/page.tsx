"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/lib/pusher/client";

export default function CallPage() {
  const params = useSearchParams();
  const router = useRouter();

  const callerId = params.get("callerId");
  const receiverId = params.get("receiverId");
  const type = params.get("type"); // "audio" or "video"

  const [status, setStatus] = useState("Connecting...");
  const [callId, setCallId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasStarted = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!callerId || !receiverId || !type || hasStarted.current) return;
    hasStarted.current = true;

    const startCall = async () => {
      try {
        setStatus("Connecting...");
        setIsLoading(true);
        const tz = new Date().getTimezoneOffset();

        // 1️⃣ Create call in DB
        const res = await fetch(`/api/calls/${receiverId}?tz=${tz}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caller_id: Number(callerId), call_type: type }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error("❌ Failed to start call:", data);
          setStatus("Failed to start call.");
          setIsLoading(false);
          return;
        }

        setCallId(data.id);
        setStatus("Ringing...");
        setIsLoading(false);

        // 2️⃣ Listen for receiver response via Pusher
        const channel = pusherClient(Number(callerId));
        console.log("📡 Caller subscribed to Pusher channel:", callerId);

        channel.bind("call-response", (payload: any) => {
          if (payload.callId !== data.id) return;

          console.log("📣 Caller received call-response:", payload);

          if (payload.response === "accepted") {
            setStatus("Call accepted!");
            const locale = window.location.pathname.split("/")[1] || "en";
            window.location.href = `/${locale}/my-messages/webrtc-call?callerId=${callerId}&receiverId=${receiverId}&type=${type}`;
          } else if (payload.response === "declined") {
            setStatus("Call was declined by receiver.");
          }

          // Clear timeout after any response
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        });

        // 3️⃣ Timeout if no answer after 30s
        timeoutRef.current = setTimeout(() => {
          setStatus("No answer. Receiver may be offline.");
        }, 30000);

      } catch (err) {
        console.error("❌ Error creating call:", err);
        setStatus("Error starting call.");
        setIsLoading(false);
      }
    };

    startCall();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [callerId, receiverId, type]);

  const endCall = async () => {
    if (!callId) return;
    try {
      const tz = new Date().getTimezoneOffset();
      await fetch(`/api/calls/${receiverId}?tz=${tz}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: callId, status: "ended" }),
      });

      setStatus("Call ended");
      setTimeout(() => {
        router.push(`/en/my-messages/conversation?receiverId=${receiverId}`);
      }, 1000);
    } catch (err) {
      console.error("❌ Error ending call:", err);
    }
  };

  return (
    <main className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white text-center p-6">
      <h1 className="text-xl font-bold mb-4 whitespace-pre-line">{status}</h1>

      {callId && (
        <button
          onClick={endCall}
          className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition"
        >
          End Call
        </button>
      )}

      {isLoading && <div className="animate-pulse text-gray-400">Please wait...</div>}
    </main>
  );
}
