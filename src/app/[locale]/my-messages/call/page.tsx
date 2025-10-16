"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CallUI from "./CallUI";
import { useCallHandler } from "./useCallHandler";
import { useSocket } from "@/context/SocketContext";

const log = (...args: any[]) =>
  console.log(`[${new Date().toISOString()}]`, ...args);

export default function CallPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { socket } = useSocket();

  const urlCallerId = Number(params.get("callerId"));
  const urlReceiverId = Number(params.get("receiverId"));
  const callType = (params.get("type") as "audio" | "video") || "audio";
  const callIdParam = params.get("callId");

  const [callId, setCallId] = useState<string | null>(callIdParam);
  const [status, setStatus] = useState<
    "ringing" | "incoming" | "accepted" | "rejected" | "ended"
  >(callIdParam ? "accepted" : "ringing");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const hasCreatedCall = useRef(false);

  // 🧠 Load logged-in user once
  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (id) {
      setCurrentUserId(Number(id));
      log("👤 Loaded logged-in user:", id);
    }
  }, []);

  const isCaller = useMemo(
    () => currentUserId === urlCallerId,
    [currentUserId, urlCallerId]
  );

  const callerId = urlCallerId;
  const receiverId = urlReceiverId;

  // =====================================================
  // 📞 CREATE CALL RECORD (Caller only)
  // =====================================================
  useEffect(() => {
    if (!isCaller || hasCreatedCall.current || callId) return;
    if (!callerId || !receiverId) return;
    hasCreatedCall.current = true;

    (async () => {
      try {
        log("📤 Creating call record...");
        const res = await fetch(`/api/calls/${receiverId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caller_id: callerId, call_type: callType }),
        });
        const data = await res.json();
        if (data.success && data.call?.id) {
          setCallId(String(data.call.id));
          log("✅ Call record created:", data.call.id);
        } else log("❌ Call creation failed:", data.error);
      } catch (err) {
        log("⚠️ Error creating call:", err);
      }
    })();
  }, [isCaller, callerId, receiverId, callId, callType]);

  // =====================================================
  // 🧩 Initialize WebRTC *AFTER* user + socket ready
  // =====================================================
  const shouldInitWebRTC =
    socket && currentUserId && (isCaller || callId) && callerId && receiverId;

  const { localVideoRef, remoteVideoRef, cleanup } = useCallHandler({
    callerId,
    receiverId,
    callType,
    socket,
    onConnected: () => {
      setStatus("accepted");
      log("✅ WebRTC connected — status set to accepted");
    },
  });

  // =====================================================
  // 🎧 Socket Call Status Listeners
  // =====================================================
  useEffect(() => {
    if (!socket || !callId) return;
    log("🔗 Listening for call events", { callId });

    const handleAccepted = (call: any) => {
      if (call.id?.toString() === callId) setStatus("accepted");
    };

    const handleRejected = (call: any) => {
      if (call.id?.toString() === callId) {
        setStatus("rejected");
        cleanup();
        setTimeout(() => router.back(), 1500);
      }
    };

    const handleEnded = (call: any) => {
      if (call.id?.toString() === callId) {
        setStatus("ended");
        cleanup();
        setTimeout(() => router.back(), 1500);
      }
    };

    socket.on("call:accepted", handleAccepted);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:accepted", handleAccepted);
      socket.off("call:rejected", handleRejected);
      socket.off("call:ended", handleEnded);
    };
  }, [socket, callId, router, cleanup]);

  // =====================================================
  // 🔚 End call manually
  // =====================================================
  const handleEnd = async () => {
    if (!callId) return;
    try {
      await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ended" }),
      });
      setStatus("ended");
      cleanup();
      setTimeout(() => router.back(), 1500);
      log("✅ Call ended successfully");
    } catch (err) {
      log("⚠️ Error ending call:", err);
    }
  };

  // =====================================================
  // 🧹 Cleanup when page unmounts
  // =====================================================
  useEffect(() => {
    return () => {
      log("🧹 Page unmount → closing WebRTC");
      cleanup();
    };
  }, [cleanup]);

  // =====================================================
  // 🕒 Loading UI
  // =====================================================
  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading call...
      </div>
    );
  }

  // =====================================================
  // 🎥 Render
  // =====================================================
  return (
    <CallUI
      status={status}
      callType={callType}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      onEnd={handleEnd}
      isCaller={isCaller}
    />
  );
}
