"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";

interface IncomingCall {
  id: number;
  caller_id: number;
  receiver_id: number;
  call_type: "audio" | "video";
  call_status: string;
  started_at?: string;
  created_at?: string;
  message?: string;
}

export default function CallHandler() {
  const router = useRouter();
  const { socket } = useSocket();

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentUserId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  const locale = "en"; // adjust if needed

  useEffect(() => {
    if (!socket) return;

    // ✅ Make sure this user joins their personal room to receive events
    if (currentUserId) {
      console.log("👤 Joining user room:", currentUserId);
      socket.emit("joinUserRoom", { userId: currentUserId });
    }

    const handleIncoming = (data: IncomingCall) => {
      console.log("📞 Incoming call event received:", data);
      if (String(data.receiver_id) === currentUserId) {
        setIncomingCall(data);
      } else {
        console.log("➡️ Ignored call not meant for this user.");
      }
    };

    const handleCallAccepted = (data: IncomingCall) => {
      console.log("✅ Call accepted:", data);

      // For both caller and receiver, navigate only when accepted
      if (
        String(data.caller_id) === currentUserId ||
        String(data.receiver_id) === currentUserId
      ) {
        router.push(
          `/${locale}/my-messages/call?callId=${data.id}&callerId=${data.caller_id}&receiverId=${data.receiver_id}&type=${data.call_type}`
        );
      }

      setIncomingCall(null);
    };

    const handleCallEnded = (data: IncomingCall) => {
      console.log("📴 Call ended or rejected:", data);
      setIncomingCall(null);
    };

    // 🎧 Listen for call-related events
    socket.on("call:ringing", handleIncoming);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallEnded);

    return () => {
      socket.off("call:ringing", handleIncoming);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallEnded);
    };
  }, [socket, currentUserId, router, locale]);

  const handleAccept = async () => {
    if (!incomingCall || isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/calls/${incomingCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });

      if (!response.ok) throw new Error("Failed to accept call");

      console.log("📡 Waiting for server to emit call:accepted...");
      // Wait for socket event to handle navigation
    } catch (err) {
      console.error("❌ Accept call failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!incomingCall || isProcessing) return;
    setIsProcessing(true);

    try {
      await fetch(`/api/calls/${incomingCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      setIncomingCall(null);
    } catch (err) {
      console.error("❌ Reject call failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[9999] backdrop-blur-sm">
      <div className="bg-white text-black p-6 rounded-2xl shadow-2xl w-[340px] text-center animate-fadeIn">
        <h2 className="text-lg font-semibold mb-2">
          Incoming {incomingCall.call_type} call
        </h2>
        <p className="text-gray-600 mb-6">
          Caller ID:{" "}
          <span className="font-bold text-gray-800">
            {incomingCall.caller_id}
          </span>
        </p>

        <div className="flex justify-center gap-6">
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
