"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  PhoneIncoming,
  Phone,
} from "lucide-react";

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

export default function CallUI({
  status,
  callType,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onCancel,
  onEnd,
  isCaller,
}: CallUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    }
    setIsMuted((prev) => !prev);
  };

  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    }
    setIsVideoOn((prev) => !prev);
  };

  return (
    <main className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-black to-gray-900 text-white relative overflow-hidden">
      {/* Call Header */}
      <div className="absolute top-6 text-center">
        <h1 className="text-xl font-bold capitalize">{callType} Call</h1>
        <p className="text-gray-400 text-sm mt-1">
          {isCaller ? "Calling..." : "Receiving..."}
        </p>
      </div>

      {/* Status Message */}
      {status === "ringing" && (
        <div className="flex flex-col items-center mt-20 animate-pulse">
          <Phone className="text-green-400" size={42} />
          <p className="mt-3 text-gray-300">Calling...</p>
        </div>
      )}
      {status === "incoming" && (
        <div className="flex flex-col items-center mt-20 animate-bounce">
          <PhoneIncoming className="text-green-400" size={42} />
          <p className="mt-3 text-gray-300">Incoming {callType} Call...</p>
        </div>
      )}
      {["rejected", "cancelled", "ended"].includes(status) && (
        <p className="text-gray-400 mt-20 text-lg">
          Call {status === "ended" ? "ended" : status}...
        </p>
      )}

      {/* Video Layout */}
      {status === "accepted" && callType === "video" && (
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-black"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-6 right-6 w-32 h-40 rounded-xl border border-white/30 shadow-lg"
          />
        </div>
      )}

      {/* Audio Call Layout */}
      {status === "accepted" && callType === "audio" && (
        <div className="flex flex-col items-center justify-center mt-24">
          <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center text-3xl mb-4">
            🎧
          </div>
          <p className="text-gray-300">Audio call connected</p>
        </div>
      )}

      {/* Incoming Call Actions */}
      {status === "incoming" && (
        <div className="absolute bottom-16 flex gap-8">
          <button
            onClick={onAccept}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold transition"
          >
            <Phone className="text-white" size={20} />
            Accept
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition"
          >
            <PhoneOff className="text-white" size={20} />
            Reject
          </button>
        </div>
      )}

      {/* Caller Waiting - Cancel */}
      {isCaller && status === "ringing" && (
        <button
          onClick={onCancel}
          className="absolute bottom-10 flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full font-semibold transition"
        >
          <PhoneOff size={20} />
          Cancel Call
        </button>
      )}

      {/* In-call Controls */}
      {status === "accepted" && (
        <div className="absolute bottom-10 flex gap-6 bg-black/40 p-4 rounded-full backdrop-blur-lg">
          <button
            onClick={toggleMute}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              title={isVideoOn ? "Turn Off Camera" : "Turn On Camera"}
            >
              {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}

          <button
            onClick={onEnd}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
            title="End Call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}
    </main>
  );
}
