"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "@/context/SocketContext";

interface UseCallHandlerProps {
  callerId: number;
  receiverId: number;
  callType: "audio" | "video";
  socket?: Socket | null;
  onConnected?: () => void;
}

// 🧠 Centralized log formatter
const log = (role: string, tag: string, ...args: any[]) =>
  console.log(
    `%c[${new Date().toISOString()}] [${role}] ${tag}`,
    "color:#00FFFF;font-weight:bold;",
    ...args
  );

export function useCallHandler({
  callerId,
  receiverId,
  callType,
  socket: propSocket,
  onConnected,
}: UseCallHandlerProps) {
  const contextSocket = useSocket()?.socket;
  const socket = propSocket ?? contextSocket;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const candidateBuffer = useRef<RTCIceCandidateInit[]>([]);

  const [isCaller, setIsCaller] = useState<boolean | null>(null);

  const startedRef = useRef(false);
  const setupDoneRef = useRef(false);
  const joinedRef = useRef(false);
  const handleSignalRef = useRef<any>(null);

  const roomId = [callerId, receiverId].sort((a, b) => a - b).join("-");

  // 🎭 Determine role
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCallerId = Number(params.get("callerId"));
    const userId = Number(localStorage.getItem("user_id"));
    const role = userId === urlCallerId ? "CALLER" : "RECEIVER";
    setIsCaller(role === "CALLER");
    log(role, "🎭 Role determined", { callerId, receiverId, roomId });
  }, [callerId, receiverId]);

  // 🧹 Cleanup
  const cleanup = () => {
    const role = isCaller ? "CALLER" : "RECEIVER";
    log(role, "🧹 Cleanup triggered");

    if (!setupDoneRef.current) {
      log(role, "⏳ Setup incomplete — skipping cleanup");
      return;
    }

    if (handleSignalRef.current && socket) {
      socket.off("webrtc:signal", handleSignalRef.current);
      handleSignalRef.current = null;
    }

    candidateBuffer.current = [];

    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
      } catch (e) {
        log(role, "⚠️ Error closing pc:", e);
      }
      pcRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    startedRef.current = false;
    setupDoneRef.current = false;
    joinedRef.current = false;

    log(role, "✅ Cleanup complete");
  };

  // 🔧 Setup once
  useEffect(() => {
    if (!socket || isCaller === null) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const role = isCaller ? "CALLER" : "RECEIVER";
    let active = true;

    const createPeerConnection = () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:relay1.expressturn.com:3478",
            username: "efC0FqQYmgArqtm1F4",
            credential: "x5qswk6n4GZ5m6N9",
          },
        ],
      });

      pc.oniceconnectionstatechange = () =>
        log(role, "🌐 ICE:", pc.iceConnectionState);
      pc.onconnectionstatechange = () =>
        log(role, "🔗 Conn:", pc.connectionState);
      pc.onsignalingstatechange = () =>
        log(role, "📶 Signal:", pc.signalingState);

      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (!stream) return log(role, "⚠️ No remote stream");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
        log(role, "📡 Remote stream received");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc:signal", {
            roomId,
            senderId: isCaller ? callerId : receiverId,
            type: "candidate",
            candidate: event.candidate,
          });
        }
      };

      pcRef.current = pc;
      return pc;
    };

    const setupPeerConnection = async () => {
      const pc = createPeerConnection();

      // 🖥️ Local stream
      const stream = await navigator.mediaDevices
        .getUserMedia({ video: callType === "video", audio: true })
        .catch((err) => {
          log(role, "❌ getUserMedia failed:", err);
          return null;
        });
      if (!stream) return;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => {});
      }

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      setupDoneRef.current = true;

      // 🔔 Handle signaling
      const handleSignal = async (data: any) => {
        if (!data || data.roomId !== roomId) return;
        const selfId = isCaller ? callerId : receiverId;
        if (data.senderId === selfId) return;

        log(role, "📨 Signal:", data.type);

        try {
          if (data.type === "offer" && !isCaller) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("webrtc:signal", {
              roomId,
              senderId: receiverId,
              type: "answer",
              answer,
            });
          } else if (data.type === "answer" && isCaller) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            onConnected?.();
          } else if (data.type === "candidate" && data.candidate) {
            if (!pc.remoteDescription) {
              candidateBuffer.current.push(data.candidate);
            } else {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          }
        } catch (err) {
          log(role, "⚠️ Signal error:", err);
        }
      };

      handleSignalRef.current = handleSignal;
      socket.on("webrtc:signal", handleSignal);

      // 🚪 Join room
      socket.emit("joinRoom", { senderId: callerId, receiverId });

      // Wait for both users ready
      socket.on("room:joined", ({ roomId: joinedRoom }) => {
        if (joinedRoom !== roomId) return;
        joinedRef.current = true;
        socket.emit("checkRoomUsers", { roomId });
      });

      socket.on("room:ready", async ({ roomId: readyRoom }) => {
        if (readyRoom !== roomId || !isCaller) return;
        log(role, "📞 Both peers ready, creating offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:signal", {
          roomId,
          senderId: callerId,
          type: "offer",
          offer,
        });
      });
    };

    setupPeerConnection();

    return () => {
      active = false;
      cleanup();
    };
  }, []); // 👈 run only once

  return { localVideoRef, remoteVideoRef, isCaller, cleanup };
}
