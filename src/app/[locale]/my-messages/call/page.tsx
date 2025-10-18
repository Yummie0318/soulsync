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
  const callInitialized = useRef(false);

  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [connectionState, setConnectionState] = useState("new");

  // 🎨 Logger Utility
  const log = useCallback((label: string, data?: any, color = "cyan") => {
    const ts = new Date().toLocaleTimeString();
    console.log(`%c[📹 CallPage ${ts}] ${label}`, `color:${color};font-weight:bold;`, data ?? "");
  }, []);

  const buildRoomId = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  // ======================================================
  // 🧠 WebRTC + Socket Setup
  // ======================================================
  useEffect(() => {
    if (!socket) {
      log("⚠️ Socket not ready yet — waiting...", null, "orange");
      return;
    }
    if (!call_id || !caller_id || !receiver_id) {
      log("⛔ Missing required call params", { call_id, caller_id, receiver_id }, "red");
      return;
    }

    if (callInitialized.current) {
      log("⏩ Call already initialized — skipping duplicate setup", null, "yellow");
      return;
    }
    callInitialized.current = true;

    const currentUserId = Number(localStorage.getItem("user_id"));
    const roomId = buildRoomId(Number(caller_id), Number(receiver_id));

    log("📞 Initializing call setup", {
      call_id,
      type,
      currentUserId,
      caller_id,
      receiver_id,
      roomId,
    });

    // 🌍 Update DB if receiver
    if (String(currentUserId) === receiver_id) {
      fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id, action: "accept" }),
      })
        .then(() => {
          log("✅ Call status updated to 'accepted' in DB", null, "lightgreen");
          socket.emit("call:accepted", { call_id, caller_id, receiver_id });
          setIsAccepted(true);
        })
        .catch((err) => log("❌ Failed to update call status", err, "red"));
    }

    // 🛰️ Join socket room
    socket.emit("joinRoom", { senderId: currentUserId, receiverId: Number(receiver_id) });
    log("🏠 Joined room", { roomId });

    // 🌐 Peer Connection
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    setPc(peer);

    // 🎥 Local Media Setup
    const constraints = type === "video" ? { video: true, audio: true } : { video: false, audio: true };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        log("🎥 Local stream acquired", stream);
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        // 🧩 Setup remote stream container
        const remote = new MediaStream();
        setRemoteStream(remote);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;

        peer.ontrack = (event) => {
          log("📡 Remote track received", event.streams[0]);
          event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
        };

        // 🌍 Send offer if caller
        if (String(currentUserId) === caller_id) {
          peer
            .createOffer()
            .then((offer) => {
              peer.setLocalDescription(offer);
              socket.emit("webrtc:offer", { roomId, sdp: offer });
              log("📤 Offer sent", offer);
            })
            .catch((err) => log("❌ Offer creation failed", err, "red"));
        } else {
          log("🕓 Receiver waiting for offer...");
        }
      })
      .catch((err) => log("❌ getUserMedia failed", err, "red"));

    // 📡 Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:candidate", { roomId, candidate: event.candidate });
        log("📤 Sent ICE candidate", event.candidate);
      }
    };

    peer.onconnectionstatechange = () => {
      setConnectionState(peer.connectionState);
      log("🔗 Peer connection state:", peer.connectionState, "violet");
    };

    // ======================================================
    // 🔁 WebRTC Signaling Handlers
    // ======================================================
    socket.on("webrtc:offer", async (data) => {
      log("📩 Offer received", data);
      if (!data.sdp) return;
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, sdp: answer });
      log("📤 Answer sent", answer);
    });

    socket.on("webrtc:answer", async (data) => {
      log("📩 Answer received", data);
      if (!data.sdp) return;
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      log("✅ Remote description set");
    });

    socket.on("webrtc:candidate", (data) => {
      if (data.candidate) {
        peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        log("📥 ICE candidate added", data.candidate);
      }
    });

    // ======================================================
    // 🔔 Call Events
    // ======================================================
    socket.on("call:accepted", (payload) => {
      log("📞 Call accepted event", payload, "lightgreen");
      setIsAccepted(true);
    });

    socket.on("call:ended", (payload) => {
      log("🔚 Call ended", payload, "gray");
      endCall();
    });

    socket.onAny((event, ...args) => log(`📡 ANY EVENT → ${event}`, args, "magenta"));

    // ======================================================
    // 🧹 Cleanup
    // ======================================================
    return () => {
      log("🧹 Cleaning up call resources", null, "gray");
      callInitialized.current = false;

      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:candidate");
      socket.off("call:accepted");
      socket.off("call:ended");

      peer.close();
      localStream?.getTracks().forEach((t) => t.stop());
      remoteStream?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, call_id, caller_id, receiver_id, type, log]);

  // ======================================================
  // 🔚 End Call
  // ======================================================
  const endCall = useCallback(() => {
    if (!socket) return;
    log("🚪 Ending call manually", { call_id });
    socket.emit("call:end", { call_id, caller_id, receiver_id });
    router.push(`/${locale}/my-messages`);
  }, [socket, router, locale, call_id, caller_id, receiver_id, log]);

  // ======================================================
  // 🧱 Render
  // ======================================================
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <h2 className="text-lg font-semibold mb-4">
        {type === "video" ? "🎥 Video Call" : "🎧 Audio Call"} #{call_id}
      </h2>

      {type === "video" && (
        <div className="relative flex items-center justify-center gap-4">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-1/3 rounded-xl border border-gray-600"
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-1/3 rounded-xl border ${
              isAccepted ? "border-green-500" : "border-gray-600"
            }`}
          />
        </div>
      )}

      {type === "audio" && (
        <p className="text-gray-400 mt-4">
          {isAccepted ? "🎧 Audio call in progress..." : "🔔 Connecting..."}
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2">Connection: {connectionState}</p>

      <button
        onClick={endCall}
        className="mt-8 bg-red-600 px-6 py-3 rounded-full hover:bg-red-700 transition"
      >
        End Call
      </button>
    </div>
  );
}
