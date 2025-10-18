"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSocket } from "@/providers/SocketProvider";

export default function CallPage() {
  const router = useRouter();
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const socket = useSocket();

  const call_id = searchParams.get("call_id");
  const caller_id = searchParams.get("caller_id");
  const receiver_id = searchParams.get("receiver_id");
  const type = (searchParams.get("type") as "audio" | "video") ?? "audio";

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [isAccepted, setIsAccepted] = useState(false);
  const [connectionState, setConnectionState] = useState("new");

  // Logger
  const log = useCallback((label: string, data?: any, color = "cyan") => {
    const ts = new Date().toLocaleTimeString();
    console.log(`%c[📹 CallPage ${ts}] ${label}`, `color:${color};font-weight:bold;`, data ?? "");
  }, []);

  const buildRoomId = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  useEffect(() => {
    if (!socket) return log("⚠️ Socket not ready", null, "orange");
    if (!call_id || !caller_id || !receiver_id) return log("⛔ Missing call params", { call_id, caller_id, receiver_id }, "red");

    const currentUserId = Number(localStorage.getItem("user_id"));
    const roomId = buildRoomId(Number(caller_id), Number(receiver_id));

    log("📞 Initializing call setup", { call_id, type, currentUserId, caller_id, receiver_id, roomId });

    // Only receiver updates DB
    if (String(currentUserId) === receiver_id) {
      fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id, action: "accept" }),
      })
        .then(() => {
          log("✅ Call accepted in DB", null, "lightgreen");
          socket.emit("call:accepted", { call_id, caller_id, receiver_id });
          setIsAccepted(true);
        })
        .catch((err) => log("❌ Failed to update DB", err, "red"));
    }

    // Join room
    socket.emit("joinRoom", { senderId: currentUserId, receiverId: Number(receiver_id) });
    log("🏠 Joined room", { roomId });

    // Create peer
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerRef.current = peer;

    // Remote stream setup
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

    peer.ontrack = (event) => {
      log("📡 Remote track received", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:candidate", { roomId, candidate: event.candidate });
        log("📤 Sent ICE candidate", event.candidate);
      }
    };

    peer.onconnectionstatechange = () => {
      setConnectionState(peer.connectionState);
      log("🔗 Peer connection state", peer.connectionState, "violet");
    };

    // Local stream
    const constraints = type === "video" ? { video: true, audio: true } : { video: false, audio: true };
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        log("🎥 Local stream acquired", stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        // Caller sends offer
        if (String(currentUserId) === caller_id) {
          peer.createOffer()
            .then((offer) => peer.setLocalDescription(offer).then(() => {
              socket.emit("webrtc:offer", { roomId, sdp: offer });
              log("📤 Offer sent", offer);
            }))
            .catch((err) => log("❌ Offer creation failed", err, "red"));
        } else {
          log("🕓 Receiver waiting for offer...");
        }
      })
      .catch((err) => log("❌ getUserMedia failed", err, "red"));

    // ===== WebRTC signaling =====
    const handleOffer = async (data: any) => {
      log("📩 Offer received", data);
      if (!data.sdp) return;
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, sdp: answer });
      log("📤 Answer sent", answer);
    };

    const handleAnswer = async (data: any) => {
      log("📩 Answer received", data);
      if (!data.sdp) return;
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      log("✅ Remote description set");
    };

    const handleCandidate = (data: any) => {
      if (data.candidate) {
        peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        log("📥 ICE candidate added", data.candidate);
      }
    };

    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:candidate", handleCandidate);

    // ===== Call events =====
    const onCallAccepted = () => setIsAccepted(true);
    const onCallEnded = () => endCall();

    socket.on("call:accepted", onCallAccepted);
    socket.on("call:ended", onCallEnded);

    socket.onAny((event, ...args) => log(`📡 ANY EVENT → ${event}`, args, "magenta"));

    // Cleanup
    return () => {
      log("🧹 Cleaning up call resources", null, "gray");
      peer.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());

      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:candidate", handleCandidate);
      socket.off("call:accepted", onCallAccepted);
      socket.off("call:ended", onCallEnded);
    };
  }, [socket, call_id, caller_id, receiver_id, type, log]);

  const endCall = useCallback(() => {
    if (!socket) return;
    log("🚪 Ending call manually", { call_id });
    socket.emit("call:end", { call_id, caller_id, receiver_id });
    router.push(`/${locale}/my-messages`);
  }, [socket, router, locale, call_id, caller_id, receiver_id, log]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <h2 className="text-lg font-semibold mb-4">
        {type === "video" ? "🎥 Video Call" : "🎧 Audio Call"} #{call_id}
      </h2>

      {type === "video" && (
        <div className="relative flex items-center justify-center gap-4">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-1/3 rounded-xl border border-gray-600" />
          <video ref={remoteVideoRef} autoPlay playsInline className={`w-1/3 rounded-xl border ${isAccepted ? "border-green-500" : "border-gray-600"}`} />
        </div>
      )}

      {type === "audio" && (
        <p className="text-gray-400 mt-4">
          {isAccepted ? "🎧 Audio call in progress..." : "🔔 Connecting..."}
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2">Connection: {connectionState}</p>

      <button onClick={endCall} className="mt-8 bg-red-600 px-6 py-3 rounded-full hover:bg-red-700 transition">
        End Call
      </button>
    </div>
  );
}
