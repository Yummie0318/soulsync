"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

const SOCKET_SERVER_URL = "https://soulsync-socket-server.onrender.com";

export default function TestWebRTC() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const log = (msg: string) => {
    console.log(msg);
    setLogs((prev) => [...prev, `${new Date().toISOString()} ${msg}`]);
  };

  // --- Connect to Socket.IO ---
  useEffect(() => {
    const s = io(SOCKET_SERVER_URL, {
      transports: ["websocket"],
    });

    setSocket(s);

    s.on("connect", () => log(`🟢 Connected to Socket.IO: ${s.id}`));
    s.on("disconnect", () => log("🔴 Disconnected from server"));
    s.on("webrtc:signal", handleSignal);

    return () => {
      s.off("webrtc:signal", handleSignal);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handle incoming WebRTC signals ---
  const handleSignal = async (data: any) => {
    try {
      if (!peerConnection.current) {
        await createPeerConnection();
      }
      const pc = peerConnection.current!;
      log(`📩 Received signal: ${data.type} from ${data.senderId ?? "remote"}`);

      if (data.type === "offer" && data.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        log("📥 Offer set as remote description");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit("webrtc:signal", {
          roomId: data.roomId,
          type: "answer",
          answer,
          senderId: userId,
        });
        log("📤 Sent answer to remote peer");
      } else if (data.type === "answer" && data.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        log("✅ Remote description set (answer)");
      } else if (data.type === "candidate" && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          log("📡 Added ICE candidate");
        } catch (err) {
          log("⚠️ Failed to add ICE candidate: " + (err as Error).message);
        }
      }
    } catch (err) {
      log("⚠️ Signal handling error: " + (err as Error).message);
      console.error(err);
    }
  };

  // --- Create Peer Connection ---
  const createPeerConnection = async () => {
    if (peerConnection.current) {
      try {
        peerConnection.current.close();
      } catch {}
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    peerConnection.current = pc;

    pc.ontrack = (event) => {
      log("🎬 Remote stream received (ontrack)");
      const stream = event.streams && event.streams[0];
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;

        // Try to play (may be blocked by autoplay policy)
        remoteVideoRef.current
          .play()
          .then(() => {
            log("▶️ remoteVideo.play() success");
          })
          .catch((err) => {
            log("⏸️ remoteVideo.play() blocked (user gesture required)");
            // user must click "Enable Audio" button to allow playback
          });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("webrtc:signal", {
          roomId,
          type: "candidate",
          candidate: event.candidate,
          senderId: userId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      log(`🔗 Connection state: ${pc.connectionState}`);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        log("🔴 Peer connection disconnected/failed");
      }
    };

    // get local stream and add tracks
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      log("📷 Local stream added");
    } catch (err) {
      log("⚠️ Failed to access camera/mic. Check browser permissions.");
      console.error("getUserMedia error:", err);
    }
  };

  // --- Join or Create Room ---
  const handleJoinRoom = async () => {
    if (!socket) return;
    if (!userId) return alert("Please enter your user ID");

    // Decide whether user is creator (no roomId supplied) or joiner (entered roomId)
    const wasEmptyRoomId = roomId.trim() === "";
    const isCreator = wasEmptyRoomId;

    let newRoomId = roomId;
    if (wasEmptyRoomId) {
      newRoomId = `room-${userId}-${Date.now()}`;
      setRoomId(newRoomId);
      log(`🆕 Created new room: ${newRoomId}`);
    }

    await createPeerConnection();

    // match backend event name ("join_room")
    socket.emit("join_room", { roomId: newRoomId, senderId: userId });

    setConnected(true);
    log(`🏠 Joined room: ${newRoomId}`);
    log("⌛ Waiting or preparing for another peer...");

    // Only the **joiner** (i.e., user who provided an existing room id) should create the offer.
    // The creator should wait and answer.
    if (!isCreator) {
      // small delay to let the other peer finish setup and to gather local candidates
      setTimeout(async () => {
        log("📞 (joiner) Creating offer...");
        await handleStartCall();
      }, 700);
    } else {
      log("🛑 (creator) Waiting for joiner to create the offer (will answer).");
    }
  };

  // --- Start Call (Offer) ---
  const handleStartCall = async () => {
    if (!peerConnection.current) await createPeerConnection();
    const pc = peerConnection.current!;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit("webrtc:signal", { roomId, type: "offer", offer, senderId: userId });
      log("📤 Sent offer to remote peer");
    } catch (err) {
      log("⚠️ Failed to create/send offer: " + (err as Error).message);
      console.error(err);
    }
  };

  // --- End Call ---
  const handleEndCall = () => {
    try {
      peerConnection.current?.close();
    } catch {}
    peerConnection.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current?.srcObject instanceof MediaStream) {
      localVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      localVideoRef.current.srcObject = null;
    }
    setConnected(false);
    log("🔚 Call ended and connection closed");
  };

  // Enable audio playback (user gesture required by some browsers)
  const handleEnableAudio = async () => {
    setAudioEnabled(true);
    if (remoteVideoRef.current) {
      try {
        remoteVideoRef.current.muted = false;
        await remoteVideoRef.current.play();
        log("🔊 Audio enabled (user gesture)");
      } catch (err) {
        log("⚠️ Could not play remote video/audio: " + (err as Error).message);
      }
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen space-y-4">
      <h1 className="text-2xl font-bold">🎥 WebRTC Test (Render)</h1>

      <div className="flex gap-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Your ID (e.g. 113)"
          className="p-2 rounded text-black"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Room ID (leave empty to create)"
          className="p-2 rounded text-black"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        {!connected ? (
          <button onClick={handleJoinRoom} className="bg-green-600 px-4 py-2 rounded">
            {roomId ? "Join Room" : "Create Room"}
          </button>
        ) : (
          <button onClick={handleEndCall} className="bg-red-600 px-4 py-2 rounded">
            End Call
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div>
          <h2 className="font-semibold mb-2">🎥 Local Video</h2>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg bg-black"
          />
        </div>
        <div>
          <h2 className="font-semibold mb-2">🖥️ Remote Video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            // do NOT mute remote by default so audio can be heard once user enables it
            className="w-full rounded-lg bg-black"
            // leave muted = true initially only if you want autoplay to succeed without user gesture,
            // but then audio will be silenced; we provide Enable Audio button to unmute.
          />
          {!audioEnabled && (
            <div className="mt-2">
              <button
                onClick={handleEnableAudio}
                className="bg-blue-600 px-3 py-1 rounded text-sm"
              >
                Enable Remote Audio
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-gray-800 p-3 rounded h-56 overflow-y-auto text-sm font-mono">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
