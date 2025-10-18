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
  const socket = useSocket();
  const router = useRouter();
  const { locale } = useParams();
  const [call, setCall] = useState<IncomingCallData | null>(null);
  const [visible, setVisible] = useState(false);
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null);

  // ======================================================
  // 🎨 Professional Logger
  // ======================================================
  const log = useCallback((label: string, data?: any, color = "cyan") => {
    const ts = new Date().toLocaleTimeString();
    console.log(
      `%c[📞 IncomingCallPopup ${ts}] ${label}`,
      `color:${color};font-weight:bold;`,
      data ?? ""
    );
  }, []);

  // ======================================================
  // 🔊 Play / Stop Ringtone
  // ======================================================
  const playRingtone = useCallback(() => {
    try {
      const audio = new Audio("/sounds/ringtone.mp3");
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(() => log("🎵 User interaction required to autoplay", null, "orange"));
      setRingtone(audio);
    } catch (err) {
      log("❌ Failed to play ringtone", err, "red");
    }
  }, [log]);

  const stopRingtone = useCallback(() => {
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
  }, [ringtone]);

  // ======================================================
  // 📡 Handle Incoming Call
  // ======================================================
  const handleIncomingCall = useCallback(
    (data: IncomingCallData) => {
      log("📩 Incoming call received", data, "yellow");

      if (!data || !data.receiver_id || !data.caller_id) {
        log("⚠️ Invalid call payload — missing IDs", data, "orange");
        return;
      }

      const currentUserId = Number(localStorage.getItem("user_id"));
      if (!currentUserId) {
        log("⚠️ No user_id in localStorage", null, "orange");
        return;
      }

      if (data.receiver_id !== currentUserId) {
        log("🚫 Call not for this user, ignoring", { target: data.receiver_id }, "gray");
        return;
      }

      // Only show popup if not already visible
      if (!visible) {
        setCall(data);
        setVisible(true);
        playRingtone();
        log("✅ Showing call popup for receiver", data, "lightgreen");
      }
    },
    [log, playRingtone, visible]
  );

  // ======================================================
  // 🔌 Attach Socket Listeners
  // ======================================================
  useEffect(() => {
    if (!socket) {
      log("⚠️ Socket not ready yet", null, "orange");
      return;
    }

    log("🔗 Attaching socket listeners", { socketId: socket.id }, "deepskyblue");

    socket.on("call:ringing", handleIncomingCall);
    socket.on("call:incoming", handleIncomingCall);

    socket.on("disconnect", (reason) => log("⚪ Socket disconnected", { reason }, "gray"));
    socket.on("connect", () => log("🟢 Socket connected", { socketId: socket.id }, "lightgreen"));
    socket.onAny((event, ...args) => log(`📡 Socket → ${event}`, args, "violet"));

    return () => {
      log("🧹 Cleaning up listeners", null, "gray");
      socket.off("call:ringing", handleIncomingCall);
      socket.off("call:incoming", handleIncomingCall);
    };
  }, [socket, handleIncomingCall, log]);

  // ======================================================
  // ✅ Accept Call
  // ======================================================
  const acceptCall = async () => {
    if (!socket || !call) return;
    stopRingtone();
    setVisible(false);

    log("✅ Accepting call", call, "lightgreen");

    // ✅ Update call status on backend
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

    // ✅ Notify caller via socket
    socket.emit("call:accept", {
      call_id: call.id,
      caller_id: call.caller_id,
      receiver_id: call.receiver_id,
      status: "accepted",
    });

    // ✅ Redirect to call page
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
  // 🧱 Render Popup
  // ======================================================
  if (!visible || !call) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[9999] animate-fade-in">
      <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-8 w-80 flex flex-col items-center gap-4">
        {call.call_type === "video" ? (
          <Video size={40} className="text-blue-600" />
        ) : (
          <Phone size={40} className="text-green-600" />
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
            className="p-4 bg-green-600 rounded-full hover:bg-green-700 transition text-white"
          >
            <Phone size={22} />
          </button>
          <button
            onClick={rejectCall}
            className="p-4 bg-red-600 rounded-full hover:bg-red-700 transition text-white"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
