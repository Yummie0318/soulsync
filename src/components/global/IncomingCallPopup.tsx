"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/providers/SocketProvider";
import { useRouter, useParams } from "next/navigation";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallData {
  id: number;
  caller_id: number;
  receiver_id: number;
  call_type: "audio" | "video";
  status?: string;
  created_at?: string;
}

export default function IncomingCallPopup() {
  // ✅ Now destructure both socket and isConnected safely
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const { locale } = useParams();

  const [call, setCall] = useState<IncomingCallData | null>(null);
  const [visible, setVisible] = useState(false);
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null);
  const [activeCallId, setActiveCallId] = useState<number | null>(null);

  // ======================================================
  // 🎨 Logger
  // ======================================================
  const log = useCallback((msg: string, data?: any, color = "cyan") => {
    console.log(`%c[📲 IncomingCallPopup] ${msg}`, `color:${color};font-weight:bold;`, data ?? "");
  }, []);

  // ======================================================
  // 🔊 Ringtone Controls
  // ======================================================
  const playRingtone = useCallback(() => {
    try {
      const audio = new Audio("/sounds/ringtone.mp3");
      audio.loop = true;
      audio.volume = 0.6;
      audio.play().catch(() => log("🎵 Autoplay blocked — user interaction required", null, "orange"));
      setRingtone(audio);
    } catch (err) {
      log("❌ Failed to play ringtone", err, "red");
    }
  }, [log]);

  const stopRingtone = useCallback(() => {
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
      setRingtone(null);
    }
  }, [ringtone]);

  // ======================================================
  // 📞 Incoming Call Handler
  // ======================================================
  const handleIncomingCall = useCallback(
    (data: IncomingCallData) => {
      log("📩 Incoming call received", data, "yellow");

      if (!data?.receiver_id || !data?.caller_id || !data?.id) {
        log("⚠️ Invalid call payload", data, "orange");
        return;
      }

      const currentUserId = Number(localStorage.getItem("user_id"));
      if (!currentUserId || data.receiver_id !== currentUserId) {
        log("🚫 Call not for this user, ignoring", null, "gray");
        return;
      }

      if (activeCallId === data.id) {
        log("⚠️ Popup already active for this call", data.id, "gray");
        return;
      }

      setCall(data);
      setActiveCallId(data.id);
      setVisible(true);
      playRingtone();
      log("✅ Showing call popup", data, "lightgreen");
    },
    [activeCallId, log, playRingtone]
  );

  // ======================================================
  // 🔌 Socket Listeners
  // ======================================================
  useEffect(() => {
    if (!socket || !isConnected) {
      log("⚠️ Socket not ready or disconnected", null, "orange");
      return;
    }

    log("🔗 Attaching socket listeners", { id: socket.id }, "deepskyblue");

    socket.off("call:ringing").on("call:ringing", handleIncomingCall);

    socket.off("call:cancelled").on("call:cancelled", (data) => {
      log("🚫 Caller cancelled call", data, "orange");
      stopRingtone();
      setVisible(false);
      setActiveCallId(null);
    });

    socket.off("call:end").on("call:end", (data) => {
      log("🔚 Call ended", data, "gray");
      stopRingtone();
      setVisible(false);
      setActiveCallId(null);
    });

    socket.on("disconnect", (reason) => {
      log("⚪ Socket disconnected", reason, "gray");
      stopRingtone();
      setVisible(false);
    });

    return () => {
      log("🧹 Cleaning up listeners", null, "gray");
      socket.off("call:ringing");
      socket.off("call:cancelled");
      socket.off("call:end");
      socket.off("disconnect");
    };
  }, [socket, isConnected, handleIncomingCall, stopRingtone, log]);

  // ======================================================
  // ✅ Accept Call
  // ======================================================
  const acceptCall = async () => {
    if (!socket || !call) return;
    stopRingtone();
    setVisible(false);
    log("✅ Accepting call", call, "lightgreen");

    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: call.id, action: "accept" }),
      });
      log("📝 Call marked as accepted via API", call, "limegreen");
    } catch (err) {
      log("❌ Failed to update call status", err, "red");
    }

    socket.emit("call:accept", {
      call_id: call.id,
      caller_id: call.caller_id,
      receiver_id: call.receiver_id,
      status: "accepted",
    });

    const url = `/${locale}/my-messages/call?call_id=${call.id}&caller_id=${call.caller_id}&receiver_id=${call.receiver_id}&type=${call.call_type}`;
    log("🌐 Redirecting to call page", url, "deepskyblue");
    router.push(url);
  };

  // ======================================================
  // 🚫 Reject Call
  // ======================================================
  const rejectCall = async () => {
    if (!socket || !call) return;
    stopRingtone();
    setVisible(false);
    log("🚫 Rejecting call", call, "orange");

    socket.emit("call:reject", {
      call_id: call.id,
      caller_id: call.caller_id,
      receiver_id: call.receiver_id,
      status: "rejected",
    });

    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: call.id, action: "reject" }),
      });
      log("📝 Call marked as rejected in DB", null, "gray");
    } catch (err) {
      log("❌ Failed to update call status", err, "red");
    }
  };

  // ======================================================
  // 🧱 UI
  // ======================================================
  if (!visible || !call) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[9999] animate-fade-in">
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl p-8 w-80 flex flex-col items-center gap-4 border border-gray-200">
        {call.call_type === "video" ? (
          <Video size={44} className="text-blue-600" />
        ) : (
          <Phone size={44} className="text-green-600" />
        )}

        <div className="text-lg font-semibold">
          Incoming {call.call_type} call
        </div>
        <div className="text-gray-500">
          from <span className="font-semibold">User #{call.caller_id}</span>
        </div>

        <div className="flex gap-6 mt-4">
          <button
            onClick={acceptCall}
            className="p-4 bg-green-600 rounded-full hover:bg-green-700 transition text-white shadow-md"
            title="Accept"
          >
            <Phone size={22} />
          </button>
          <button
            onClick={rejectCall}
            className="p-4 bg-red-600 rounded-full hover:bg-red-700 transition text-white shadow-md"
            title="Reject"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
