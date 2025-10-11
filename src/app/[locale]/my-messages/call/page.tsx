"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CallUI from "./CallUI";
import { useCallHandler } from "./useCallHandler";
import { useSocket } from "@/context/SocketContext";

export default function CallPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { socket } = useSocket();

  const callIdParam = params.get("callId");
  const callerId = Number(params.get("callerId"));
  const receiverId = Number(params.get("receiverId"));
  const callType = (params.get("type") as "audio" | "video") || "audio";

  const [callId, setCallId] = useState<string | null>(callIdParam);
  const [status, setStatus] = useState<
    "ringing" | "incoming" | "accepted" | "rejected" | "cancelled" | "ended"
  >("ringing");

  const hasCreatedCall = useRef(false);

  // Determine if this user is the caller or receiver
  const isCaller = !!callerId && !callIdParam;

  const { localVideoRef, remoteVideoRef } = useCallHandler({
    callerId,
    receiverId,
    callType,
    onConnected: () => {
      console.log("✅ WebRTC connected");
      setStatus("accepted");
    },
  });

  /* ----------------------------------------------------------------
   🆕 1️⃣ Detect incoming call (receiver side)
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (callIdParam && !isCaller) {
      console.log("📞 Incoming call detected!");
      setStatus("incoming");
    }
  }, [callIdParam, isCaller]);

  /* ----------------------------------------------------------------
   🧠 Create call record (caller only)
  ---------------------------------------------------------------- */
  useEffect(() => {
    const createCall = async () => {
      if (hasCreatedCall.current) return;
      if (!callerId || !receiverId || callId) return;

      hasCreatedCall.current = true;

      try {
        console.log("🟢 Creating call...");
        const res = await fetch(`/api/calls/${receiverId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caller_id: callerId,
            call_type: callType,
          }),
        });

        const data = await res.json();

        if (data.success && data.call?.id) {
          console.log("✅ Call created:", data.call);
          setCallId(String(data.call.id));
          setStatus("ringing"); // caller waits for acceptance
        } else {
          console.error("❌ Failed to create call:", data.error);
        }
      } catch (err) {
        console.error("⚠️ Error creating call:", err);
      }
    };

    if (!callId && callerId && receiverId) {
      createCall();
    }
  }, [callerId, receiverId, callType, callId]);

  /* ----------------------------------------------------------------
   🆕 2️⃣ Notify receiver when call is created (caller emits start)
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!socket || !callId || !isCaller) return;

    console.log("📡 Notifying receiver of new call:", callId);
    socket.emit("call:start", {
      sender_id: callerId,
      receiver_id: receiverId,
      call_id: callId,
      call_type: callType,
    });
  }, [socket, callId, isCaller, callerId, receiverId, callType]);

  /* ----------------------------------------------------------------
   🔔 Socket listeners for call status
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!socket) return;

    const handleAccepted = (call: any) => {
      if (call?.id?.toString() === callId || call?.call_id?.toString() === callId) {
        console.log("📞 Call accepted event received!");
        setStatus("accepted");
      }
    };

    const handleRejected = (call: any) => {
      if (call?.id?.toString() === callId || call?.call_id?.toString() === callId) {
        console.log("📞 Call rejected!");
        setStatus("rejected");
        setTimeout(() => router.back(), 1500);
      }
    };

    const handleEnded = (call: any) => {
      if (call?.id?.toString() === callId || call?.call_id?.toString() === callId) {
        console.log("📞 Call ended!");
        setStatus("ended");
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
  }, [socket, callId, router]);

  /* ----------------------------------------------------------------
   🔴 Cancel / Reject / End actions
  ---------------------------------------------------------------- */
  const handleCancel = async () => {
    if (!callId) return;
    await fetch(`/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setStatus("cancelled");
    setTimeout(() => router.back(), 1500);
  };

  const handleReject = async () => {
    if (!callId) return;
    await fetch(`/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    setStatus("rejected");
    setTimeout(() => router.back(), 1500);
  };

  const handleEnd = async () => {
    if (!callId) return;
    await fetch(`/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });
    setStatus("ended");
    setTimeout(() => router.back(), 1500);
  };

  /* ----------------------------------------------------------------
   🎥 Render call UI
  ---------------------------------------------------------------- */
  return (
    <CallUI
      status={status}
      callType={callType}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      onReject={handleReject}
      onCancel={handleCancel}
      onEnd={handleEnd}
      isCaller={isCaller}
    />
  );
}
