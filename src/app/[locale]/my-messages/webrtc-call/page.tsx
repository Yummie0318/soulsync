// src/app/[locale]/my-messages/webrtc-call/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher/client";

export default function WebRTCCallPage() {
  const params = useSearchParams();
  const router = useRouter();

  const callerIdStr = params.get("callerId");
  const receiverIdStr = params.get("receiverId");
  const type = params.get("type"); // "audio" or "video"

  if (!callerIdStr || !receiverIdStr) return null;

  const callerId = Number(callerIdStr);
  const receiverId = Number(receiverIdStr);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [status, setStatus] = useState("Connecting...");
  const [isCallStarted, setIsCallStarted] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof pusherClient>;
    let localStream: MediaStream;

    const startWebRTC = async () => {
      try {
        // ✅ Get media
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        // ✅ Create RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        // Add tracks
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        // Remote track handler
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.trigger("client-ice-candidate", { candidate: event.candidate, from: callerId });
          }
        };

        // ✅ Subscribe to Pusher channel
        channel = pusherClient(receiverId);

        channel.bind("client-sdp-offer", async (data: any) => {
          if (data.from !== callerId) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          pusherClient(callerId).trigger("client-sdp-answer", { sdp: answer, from: receiverId });
          setStatus("Call connected");
          setIsCallStarted(true);
        });

        channel.bind("client-sdp-answer", async (data: any) => {
          if (data.from !== receiverId) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          setStatus("Call connected");
          setIsCallStarted(true);
        });

        channel.bind("client-ice-candidate", async (data: any) => {
          if (data.from === callerId) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        // ✅ If local user is the caller, initiate the call
        const localUserId = Number(localStorage.getItem("userId"));
        if (callerId === localUserId) {
          const tz = new Date().getTimezoneOffset();
          const res = await fetch(`/api/calls/${receiverId}?tz=${tz}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caller_id: callerId, call_type: type }),
          });
          const data = await res.json();

          if (res.ok && data.id) localStorage.setItem("currentCallId", data.id.toString());

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.trigger("client-sdp-offer", { sdp: offer, from: callerId });
        }
      } catch (err) {
        console.error("WebRTC error:", err);
        setStatus("Failed to start call.");
      }
    };

    startWebRTC();

    return () => {
      pcRef.current?.close();
      localStream?.getTracks().forEach((track) => track.stop());
      channel?.unbind_all();
      channel?.unsubscribe();
    };
  }, [callerId, receiverId, type]);

  const endCall = async () => {
    pcRef.current?.close();

    const currentCallId = Number(localStorage.getItem("currentCallId"));
    await fetch(`/api/calls/${receiverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: currentCallId, status: "ended" }),
    });

    localStorage.removeItem("currentCallId");

    router.push(`/en/my-messages/conversation?receiverId=${receiverId}`);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-4">{status}</h1>

      <div className="flex gap-4 w-full max-w-2xl">
        <video ref={localVideoRef} autoPlay muted className="w-1/2 bg-black rounded" />
        <video ref={remoteVideoRef} autoPlay className="w-1/2 bg-black rounded" />
      </div>

      {isCallStarted && (
        <button
          onClick={endCall}
          className="mt-4 px-6 py-3 bg-red-600 rounded hover:bg-red-700"
        >
          End Call
        </button>
      )}
    </div>
  );
}
