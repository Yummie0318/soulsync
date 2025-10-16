"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface CallUIProps {
  status: "ringing" | "incoming" | "accepted" | "rejected" | "cancelled" | "ended";
  callType: "audio" | "video";
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onEnd?: () => void;
  isCaller?: boolean;
}

const log = (role: string, ...args: any[]) => {
  console.log(
    `[${new Date().toLocaleTimeString()}] [${role}]`,
    ...args
  );
};

export default function CallUI({
  status,
  callType,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onCancel,
  onEnd,
  isCaller = false,
}: CallUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [remoteStreamAvailable, setRemoteStreamAvailable] = useState(false);

  const role = isCaller ? "CALLER" : "RECEIVER";

  // --- Initialize local/remote video elements once ---
  useEffect(() => {
    log(role, "🎬 CallUI mounted", { callType, status });

    const localEl = localVideoRef.current;
    const remoteEl = remoteVideoRef.current;

    // Local video config
    if (localEl) {
      localEl.autoplay = true;
      localEl.playsInline = true;
      localEl.muted = true;
      localEl.onloadedmetadata = () =>
        log(role, "✅ Local video metadata loaded");
      localEl.onerror = (e) => log(role, "❌ Local video error:", e);
      log(role, "🎥 Local video initialized");
    }

    // Remote video config
    if (remoteEl) {
      remoteEl.autoplay = true;
      remoteEl.playsInline = true;
      remoteEl.onloadedmetadata = () =>
        log(role, "✅ Remote video metadata loaded");
      remoteEl.onerror = (e) => log(role, "❌ Remote video error:", e);

      const detectStream = setInterval(() => {
        const stream = remoteEl.srcObject as MediaStream | null;
        if (stream && stream.getTracks().length > 0) {
          setRemoteStreamAvailable(true);
          log(role, "🌍 Remote stream detected", {
            tracks: stream.getTracks().map((t) => t.kind),
          });
          clearInterval(detectStream);
        }
      }, 500);
    }

    return () => {
      log(role, "🧹 CallUI unmounted, cleaning refs");
    };
  }, []);

  // --- Toggle Mute ---
  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return log(role, "⚠️ No local stream to mute/unmute");
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    log(role, newMuted ? "🔇 Muted" : "🔊 Unmuted");
  };

  // --- Toggle Video ---
  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return log(role, "⚠️ No local stream to toggle video");
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    const newVideoOn = !isVideoOn;
    setIsVideoOn(newVideoOn);
    log(role, newVideoOn ? "📹 Video ON" : "🚫 Video OFF");
  };

  const showLocalVideo =
    callType === "video" && ["ringing", "incoming", "accepted"].includes(status);
  const showRemoteVideo = callType === "video" && remoteStreamAvailable;

  return (
    <main className="h-screen flex flex-col items-center justify-center bg-black text-white relative overflow-hidden">
      <h1 className="text-xl font-bold mb-2 capitalize">
        {callType} Call — {isCaller ? "Caller" : "Receiver"}
      </h1>

      {/* Status messages */}
      {status === "ringing" && (
        <p className="text-gray-400 mb-6 animate-pulse">📞 Ringing...</p>
      )}
      {["rejected", "cancelled", "ended"].includes(status) && (
        <p className="text-gray-400 mt-4">Call {status}...</p>
      )}

      {/* --- VIDEO MODE --- */}
      {callType === "video" && (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
          {showRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <span>Waiting for remote video...</span>
            </div>
          )}

          {showLocalVideo && (
            <video
              ref={localVideoRef}
              className="absolute bottom-6 right-6 w-32 h-40 rounded-xl border border-white/30 shadow-lg object-cover"
            />
          )}
        </div>
      )}

      {/* --- AUDIO MODE --- */}
      {status === "accepted" && callType === "audio" && (
        <div className="flex flex-col items-center justify-center mt-4">
          <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl mb-4">
            🎧
          </div>
          <p className="text-gray-300">Audio call connected</p>
        </div>
      )}

      {/* --- Incoming Controls --- */}
      {status === "incoming" && (
        <div className="flex gap-6 mt-6">
          <button
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Reject
          </button>
        </div>
      )}

      {/* --- Caller Cancel --- */}
      {status === "ringing" && (
        <button
          onClick={onCancel}
          className="absolute bottom-10 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold"
        >
          Cancel Call
        </button>
      )}

      {/* --- In-call Controls --- */}
      {["accepted"].includes(status) && (
        <div className="absolute bottom-10 flex gap-6">
          {callType === "video" && (
            <>
              <button
                onClick={toggleMute}
                className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                onClick={toggleVideo}
                className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              >
                {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            </>
          )}

          <button
            onClick={onEnd}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}
    </main>
  );
}
