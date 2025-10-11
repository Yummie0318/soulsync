"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";

interface UseCallHandlerProps {
  callerId: number;
  receiverId: number;
  callType: "audio" | "video";
  onConnected?: () => void;
}

export function useCallHandler({
  callerId,
  receiverId,
  callType,
  onConnected,
}: UseCallHandlerProps) {
  const { socket } = useSocket();

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const joinedRef = useRef(false);
  const setupRef = useRef(false);
  const candidateQueueRef = useRef<any[]>([]);

  // ✅ Determine if current user is caller or receiver
  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const callId = searchParams?.get("callId");
  const isCaller = !callId;

  // ✅ Create a consistent unique room ID
  const roomId =
    callerId < receiverId ? `${callerId}-${receiverId}` : `${receiverId}-${callerId}`;

  useEffect(() => {
    if (!socket) return;
    let active = true;

    /* ------------------------------------------------------
     🎥 Enable autoplay (important for mobile Safari)
    ------------------------------------------------------ */
    const enableAutoplay = (videoEl: HTMLVideoElement | null, muted = false) => {
      if (!videoEl) return;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = muted;
    };

    const drainCandidateQueue = async (pc: RTCPeerConnection) => {
      const queue = candidateQueueRef.current || [];
      if (!queue.length) return;
      for (const c of queue) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(c);
          } catch (err) {
            console.warn("⚠️ ICE candidate add failed:", err);
          }
        }
      }
      candidateQueueRef.current = [];
    };

    /* ------------------------------------------------------
     🔧 Setup WebRTC connection
    ------------------------------------------------------ */
    const setupConnection = async (createOffer: boolean) => {
      if (setupRef.current) return;
      setupRef.current = true;

      // Cleanup any existing connection
      if (peerConnection.current) {
        try {
          peerConnection.current.close();
        } catch {}
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // Optionally add TURN here if needed
        ],
      });
      peerConnection.current = pc;

      /* 🔹 Handle remote stream */
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          enableAutoplay(remoteVideoRef.current);
        }
      };

      /* 🔹 Send ICE candidates */
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc:signal", {
            roomId,
            type: "candidate",
            candidate: event.candidate,
          });
        }
      };

      /* 🔹 Capture local media */
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });

        if (!active) return;

        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream;
          enableAutoplay(localVideoRef.current, true);
        }

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      } catch (err) {
        console.error("⚠️ Failed to access camera/mic:", err);
        return;
      }

      /* ------------------------------------------------------
       📡 Handle incoming WebRTC signals
      ------------------------------------------------------ */
      const handleSignal = async (data: any) => {
        if (!active || !peerConnection.current) return;
        const pc = peerConnection.current;

        try {
          switch (data.type) {
            case "offer":
              if (isCaller) return;
              console.log("📨 Received offer → setting remote & creating answer");
              await pc.setRemoteDescription(data.offer);
              await drainCandidateQueue(pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("webrtc:signal", { roomId, type: "answer", answer });

              onConnected?.();
              break;

            case "answer":
              if (!isCaller) return;
              console.log("📨 Received answer → setting remote description");
              await pc.setRemoteDescription(data.answer);
              await drainCandidateQueue(pc);
              onConnected?.();
              break;

            case "candidate":
              if (data.candidate) {
                if (!pc.remoteDescription || !pc.remoteDescription.type) {
                  candidateQueueRef.current.push(data.candidate);
                } else {
                  await pc.addIceCandidate(data.candidate).catch(() => {});
                }
              }
              break;
          }
        } catch (err) {
          console.error("⚠️ Error processing WebRTC signal:", err);
        }
      };

      socket.off("webrtc:signal", handleSignal);
      socket.on("webrtc:signal", handleSignal);

      /* ------------------------------------------------------
       🧩 Caller immediately creates offer
      ------------------------------------------------------ */
      if (createOffer && isCaller) {
        console.log("📤 Creating offer (caller)...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:signal", { roomId, type: "offer", offer });
      }
    };

    /* ------------------------------------------------------
     🔔 Join WebSocket Room
    ------------------------------------------------------ */
    if (!joinedRef.current) {
      console.log("🎧 Joining room:", roomId);
      socket.emit("joinRoom", { senderId: callerId, receiverId });
      joinedRef.current = true;
    }

    /* ------------------------------------------------------
     📞 Receiver listens for 'call:accepted' to start WebRTC
    ------------------------------------------------------ */
    const handleCallAccepted = async (call: any) => {
      const currentCallId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callId")
          : null;

      if (call?.id?.toString() === currentCallId && !isCaller) {
        console.log("✅ Call accepted → starting WebRTC (receiver)");
        await setupConnection(false);
        onConnected?.();
      }
    };

    if (isCaller) {
      setupConnection(true).catch((err) =>
        console.error("⚠️ setupConnection (caller) failed:", err)
      );
    } else {
      socket.off("call:accepted", handleCallAccepted);
      socket.on("call:accepted", handleCallAccepted);
    }

    /* ------------------------------------------------------
     🧹 Cleanup when component unmounts
    ------------------------------------------------------ */
    return () => {
      active = false;
      setupRef.current = false;
      console.log("🧹 Leaving room:", roomId);

      try {
        socket.emit("leave_room", { roomId, senderId: callerId });
      } catch {}

      socket.off("webrtc:signal");
      socket.off("call:accepted", handleCallAccepted);
      candidateQueueRef.current = [];

      if (peerConnection.current) {
        try {
          peerConnection.current.close();
        } catch {}
        peerConnection.current = null;
      }
    };
  }, [socket, callerId, receiverId, callType]);

  return { localVideoRef, remoteVideoRef };
}
