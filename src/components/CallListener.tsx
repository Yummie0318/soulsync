"use client";

import { useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher/client";

interface IncomingCall {
  callerId: number;
  callerName: string; // ✅ Added for username
  callType: string;
  callId: number;
}

export default function CallListener() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Load userId from localStorage
  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (id) {
      setUserId(Number(id));
      console.log("🔑 Loaded userId from localStorage:", id);
    } else {
      console.warn("⚠️ No userId found in localStorage");
    }
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!userId) return;

    const channel = pusherClient(userId);
    console.log("📡 Subscribed to Pusher channel for user:", userId);

    channel.bind("incoming-call", async (data: any) => {
      console.log("📞 Incoming call event received:", data);

      // Fetch caller username
      let callerName = `User ${data.callerId}`;
      try {
        const res = await fetch(`/api/users/${data.callerId}`);
        if (res.ok) {
          const user = await res.json();
          if (user?.name) callerName = user.name;
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch caller name:", err);
      }

      setIncomingCall({
        callerId: Number(data.callerId),
        callerName,
        callType: data.callType,
        callId: data.callId,
      });
    });

    // Handle call responses (from caller perspective)
    channel.bind("call-response", (data: any) => {
      console.log("📣 Call response received:", data);
      if (incomingCall && data.callId === incomingCall.callId) {
        // Auto-hide popup if receiver declined
        setIncomingCall(null);
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      console.log("❌ Unsubscribed from Pusher channel");
    };
  }, [userId, incomingCall?.callId]);

  const acceptCall = async () => {
    if (!incomingCall || !userId) return;

    try {
      console.log("✅ Accepting call:", incomingCall);
      await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerId: incomingCall.callerId,
          receiverId: userId,
          response: "accepted",
          callId: incomingCall.callId,
        }),
      });

      setIncomingCall(null);

      // Redirect to WebRTC call page
      const locale = window.location.pathname.split("/")[1] || "en";
      window.location.href = `/${locale}/my-messages/webrtc-call?callerId=${incomingCall.callerId}&receiverId=${userId}&type=${incomingCall.callType}`;
    } catch (err) {
      console.error("❌ Failed to accept call:", err);
    }
  };

  const declineCall = async () => {
    if (!incomingCall || !userId) return;

    try {
      console.log("❌ Declining call:", incomingCall);
      await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerId: incomingCall.callerId,
          receiverId: userId,
          response: "declined",
          callId: incomingCall.callId,
        }),
      });

      // Hide popup
      setIncomingCall(null);
    } catch (err) {
      console.error("❌ Failed to decline call:", err);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-800 text-white rounded-lg shadow-lg p-4">
      <h2 className="font-bold text-sm mb-1">
        Incoming {incomingCall.callType} call
      </h2>
      <p className="text-xs mb-2">From {incomingCall.callerName}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={acceptCall}
          className="px-2 py-1 text-xs bg-green-600 rounded hover:bg-green-700"
        >
          Accept
        </button>
        <button
          onClick={declineCall}
          className="px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-700"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
