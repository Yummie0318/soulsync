"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSocket } from "@/providers/SocketProvider";
import AuthGuard from "@/components/AuthGuard"; // adjust path if needed
/**
 * ✅ Stable CallPage.tsx
 * - fixes receiverId mismatch (black remote video)
 * - guarantees consistent room join across peers
 * - includes ICE queue and safe cleanup
 */

export default function CallPage() {
  const router = useRouter();
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();

  const call_id = searchParams.get("call_id");
  const caller_id = searchParams.get("caller_id");
  const receiver_id = searchParams.get("receiver_id");
  const type = (searchParams.get("type") as "audio" | "video") ?? "audio";

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const initializedRef = useRef(false);

  const [isAccepted, setIsAccepted] = useState(false);
  const [connectionState, setConnectionState] = useState("new");

  const log = useCallback((label: string, data?: any, color = "cyan") => {
    const ts = new Date().toLocaleTimeString();
    console.log(`%c[📞 ${ts}] ${label}`, `color:${color};font-weight:bold;`, data ?? "");
  }, []);

  const buildRoomId = (a: number, b: number) =>
    a < b ? `${a}-${b}` : `${b}-${a}`;

  const endCall = useCallback(() => {
    if (!socket) return;
    log("🚪 Ending call manually", { call_id });
    try {
      socket.emit("call:end", { call_id, caller_id, receiver_id });
    } catch (err) {
      log("⚠️ socket.emit call:end failed", err, "orange");
    }

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();
    } catch (err) {
      log("⚠️ Error cleaning media/peer", err, "orange");
    }

    router.push(`/${locale}/my-messages`);
  }, [socket, router, locale, call_id, caller_id, receiver_id, log]);

  useEffect(() => {
    if (!socket) {
      log("⚠️ Socket not ready", null, "orange");
      return;
    }
    if (!isConnected) {
      log("⚠️ Socket not connected yet — waiting", null, "orange");
      return;
    }
    if (!call_id || !caller_id || !receiver_id) {
      log("❌ Missing call params", { call_id, caller_id, receiver_id }, "red");
      return;
    }

    if (initializedRef.current) {
      log("⚙️ Already initialized — skipping", null, "gray");
      return;
    }
    initializedRef.current = true;

    let cancelled = false;
    const currentUserId = Number(localStorage.getItem("user_id"));
    const roomId = buildRoomId(Number(caller_id), Number(receiver_id));
    const isCaller = String(currentUserId) === String(caller_id);

    // ✅ Determine correct target user (prevents ID mixup)
    const targetId = isCaller
      ? Number(receiver_id)
      : Number(caller_id);

    log("📞 Initializing call", {
      call_id,
      type,
      currentUserId,
      isCaller,
      targetId,
      roomId,
    });

    // Receiver auto-accepts via PATCH + emit
    if (!isCaller) {
      fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id, action: "accept" }),
      })
        .then(() => {
          try {
            socket.emit("call:accepted", { call_id, caller_id, receiver_id });
          } catch (err) {
            log("⚠️ emit call:accepted failed", err, "orange");
          }
          setIsAccepted(true);
          log("✅ Receiver marked call accepted");
        })
        .catch((err) => log("❌ Failed to mark accepted", err, "red"));
    }

    // ✅ Join shared signaling room
    try {
      socket.emit("joinRoom", {
        senderId: currentUserId,
        receiverId: targetId,
      });
      log("🏠 joinRoom emitted", {
        roomId,
        sender: currentUserId,
        receiverId: targetId,
      });
    } catch (err) {
      log("⚠️ joinRoom emit failed", err, "orange");
    }

    // ---------------- WebRTC setup ----------------
    const candidateQueue: RTCIceCandidateInit[] = [];
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    peerRef.current = peer;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.autoplay = true;
      remoteVideoRef.current.playsInline = true;
    }

    peer.ontrack = (evt) => {
      try {
        const stream = evt.streams[0];
        if (stream) {
          stream.getTracks().forEach((t) => {
            if (!remoteStream.getTracks().some((rt) => rt.id === t.id))
              remoteStream.addTrack(t);
          });
        }
        if (remoteVideoRef.current) {
          const playPromise = remoteVideoRef.current.play();
          playPromise?.catch((err) =>
            log("⚠️ Autoplay blocked (remote)", err, "orange")
          );
        }
        log("📡 ontrack event", evt);
      } catch (err) {
        log("❌ Error in ontrack handler", err, "red");
      }
    };

    peer.onicecandidate = (evt) => {
      if (evt.candidate) {
        try {
          socket.emit("webrtc:candidate", { roomId, candidate: evt.candidate });
          log("📤 Sent ICE candidate", evt.candidate);
        } catch (err) {
          log("⚠️ emit candidate failed", err, "orange");
        }
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      setConnectionState(state);
      log("🔗 peer.connectionState", state);
      if (["failed", "disconnected", "closed"].includes(state)) {
        log("❌ Peer state bad — ending call", state, "red");
        setTimeout(() => !cancelled && endCall(), 300);
      }
    };

    // Get user media
    const constraints =
      type === "video"
        ? { video: { facingMode: "user" }, audio: true }
        : { audio: true };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.play().catch(() => {});
        }

        stream.getTracks().forEach((track) => {
          if (peer.connectionState !== "closed") peer.addTrack(track, stream);
        });

        log("🎥 Local stream ready", stream);

        if (isCaller && !cancelled) {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("webrtc:offer", {
            roomId,
            sdp: peer.localDescription,
            caller_id,
            receiver_id,
          });
          log("📤 Offer created and sent");
        } else {
          log("🕓 Waiting for offer...", null, "gray");
        }
      })
      .catch((err) => log("❌ getUserMedia failed", err, "red"));

    // Handle remote offers/answers/candidates
    const handleOffer = async (data: any) => {
      if (cancelled || !data?.sdp) return;
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      while (candidateQueue.length) {
        const c = candidateQueue.shift()!;
        await peer.addIceCandidate(new RTCIceCandidate(c));
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, sdp: answer, caller_id, receiver_id });
      log("📤 Answer created and emitted");
    };

    const handleAnswer = async (data: any) => {
      if (cancelled || !data?.sdp) return;
      await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      while (candidateQueue.length) {
        const c = candidateQueue.shift()!;
        await peer.addIceCandidate(new RTCIceCandidate(c));
      }
      log("📩 Answer received & applied");
    };

    const handleCandidate = async (data: any) => {
      const c: RTCIceCandidateInit | undefined = data?.candidate;
      if (!c) return;
      if (!peer.remoteDescription) {
        candidateQueue.push(c);
        log("🧊 Queued ICE candidate");
        return;
      }
      await peer.addIceCandidate(new RTCIceCandidate(c));
      log("📥 ICE candidate added");
    };

    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:candidate", handleCandidate);

    const onCallAccepted = (p: any) => {
      log("📞 call:accepted received", p, "lightgreen");
      setIsAccepted(true);
    };
    const onCallEnded = () => {
      log("🔚 call ended received — closing", null, "gray");
      endCall();
    };

    socket.on("call:accepted", onCallAccepted);
    socket.on("call:ended", onCallEnded);

    return () => {
      cancelled = true;
      initializedRef.current = false;
      log("🧹 Cleanup CallPage");

      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:candidate", handleCandidate);
      socket.off("call:accepted", onCallAccepted);
      socket.off("call:ended", onCallEnded);

      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [socket, isConnected, call_id, caller_id, receiver_id, type, log, endCall]);

  return (
    <AuthGuard>
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <h2 className="text-lg font-semibold mb-4">
        {type === "video" ? "🎥 Video Call" : "🎧 Audio Call"} #{call_id}
      </h2>

      {type === "video" ? (
        <div className="relative flex items-center justify-center gap-4 w-full max-w-4xl px-4">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full rounded-xl border border-green-500 bg-black"
          />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-6 right-6 w-1/4 rounded-lg border border-gray-400 bg-gray-700"
          />
        </div>
      ) : (
        <p className="text-gray-400 mt-4">
          {isAccepted
            ? "🎧 Audio call in progress..."
            : "🔔 Connecting..."}
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
    </AuthGuard>
  );
}
