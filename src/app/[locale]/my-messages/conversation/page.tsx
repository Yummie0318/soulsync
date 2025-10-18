"use client";

import { useNotification } from "@/context/NotificationContext";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, Paperclip, Smile, Send, X } from "lucide-react";
import { useEffect, useState, useRef, useLayoutEffect, FormEvent } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import socket from "@/lib/socketClient"; // ✅ works with your current file


// ------------------------------------------------------
// Types
// ------------------------------------------------------
type EmojiReaction = {
  emoji: string;
  user_id: number;
  username?: string;
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  message_type: string;
  file_name?: string | null;
  file_path?: string | null;
  status: string;
  created_at: string;
  created_at_local?: string;
  reply_to_id?: number | null;
  reply_content?: string | null;
  reply_sender_id?: number | null;
  emoji_reactions?: EmojiReaction[];
  edited?: boolean;
  edited_at?: string | null;
  edited_at_local?: string | null;
};

type User = {
  id: number;
  username: string;
  photo?: string | null;
  isOnline?: boolean;
  last_active?: string | null;
  last_active_local?: string | null;
};

// ------------------------------------------------------
export default function ConversationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale } = useParams();
  const { showNotification } = useNotification();

  const receiverId = params.get("receiverId");
  const [userId, setUserId] = useState<number | null>(null);

  // 🔹 Messages and user info
  const [messages, setMessages] = useState<Message[]>([]);
  const [receiver, setReceiver] = useState<User | null>(null);

  // 🔹 Input states
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Typing + emoji + edit/delete
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // 🔹 Scroll helpers
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const [previewPostImage, setPreviewPostImage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // 🔹 Action menu (long press / right click)
  const [actionMenu, setActionMenu] = useState<{
    open: boolean;
    msg?: Message;
    x?: number;
    y?: number;
  }>({ open: false });

  // 🔹 Touch timer for mobile long press
  const touchTimer = useRef<number | null>(null);

  // ------------------------------------------------------
  // Reaction info (popover)
  // ------------------------------------------------------
  const [reactionInfo, setReactionInfo] = useState<{
    visible: boolean;
    emoji: string | null;
    msgId: number | null;
    users: { user_id: number; username?: string }[];
  }>({
    visible: false,
    emoji: null,
    msgId: null,
    users: [],
  });

  // ------------------------------------------------------
  // Helper: add or update message without creating duplicates
  // ------------------------------------------------------
  const addOrUpdateMessage = (msg: Message) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      if (exists) return prev.map((m) => (m.id === msg.id ? msg : m));
      return [...prev, msg];
    });
  };

// ------------------------------------------------------
// Navigation to call (audio/video) with DB record creation & pro logs
// ------------------------------------------------------
const navigateToCall = async (type: "audio" | "video") => {
  if (!userId || !receiverId) {
    console.warn("[🚫 navigateToCall] Missing user or receiver info", { userId, receiverId });
    return showNotification("User info incomplete");
  }

  try {
    setLoading(true);
    console.log("[📞 navigateToCall] Starting call creation...", {
      caller_id: userId,
      receiver_id: receiverId,
      type,
    });

    // Create a new call record in the database
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caller_id: userId,
        receiver_id: Number(receiverId),
        call_type: type, // "audio" | "video"
      }),
    });

    const data = await res.json();
    console.log("[📞 navigateToCall] API response:", data);

    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Failed to initiate call");
    }

    const call = data.data || data.call;
    const callId = call?.id;

    if (!callId) throw new Error("Invalid call response (missing ID)");

    // ✅ Emit socket event so receiver sees popup
    console.log("[📡 navigateToCall] Emitting call:incoming", {
      id: callId,
      caller_id: userId,
      receiver_id: Number(receiverId),
      call_type: type,
      status: "ringing",
    });

    socket.emit("call:incoming", {
      id: callId,
      caller_id: userId,
      receiver_id: Number(receiverId),
      call_type: type,
      status: "ringing",
    });

    // ✅ Construct proper URL with full params
    const callUrl = `/${locale}/my-messages/call?call_id=${callId}&caller_id=${userId}&receiver_id=${receiverId}&type=${type}`;
    console.log("[🔗 navigateToCall] Redirecting to:", callUrl);

    // ✅ Redirect to the call UI page
    router.push(callUrl);

  } catch (err: any) {
    console.error("[❌ navigateToCall] Error:", err);
    showNotification(err.message || "Unable to start call");
  } finally {
    setLoading(false);
    console.log("[🧭 navigateToCall] Done");
  }
};

  // ------------------------------------------------------
  // Load logged user
  // ------------------------------------------------------
  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (stored) setUserId(Number(stored));
  }, []);

  // ------------------------------------------------------
  // Typing indicator (send)
  // ------------------------------------------------------
  const updateTypingStatus = (typing: boolean) => {
    // require receiver id from fetched receiver
    if (!userId || !receiver?.id) return;
    fetch("/api/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id: userId, receiver_id: receiver.id, is_typing: typing }),
    }).catch(console.error);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    const typingNow = value.trim() !== "" || !!file;
    updateTypingStatus(typingNow);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (!newMessage.trim() && !file) updateTypingStatus(false);
    }, 5000);
  };

  useEffect(() => {
    const typingNow = newMessage.trim() !== "" || !!file;
    updateTypingStatus(typingNow);

    if (!typingNow && typingTimeout.current) clearTimeout(typingTimeout.current);
    if (!typingNow)
      typingTimeout.current = setTimeout(() => updateTypingStatus(false), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // ------------------------------------------------------
  // Receive typing (poll fallback)
  // ------------------------------------------------------
  useEffect(() => {
    if (!userId || !receiver?.id) return;

    const interval = setInterval(async () => {
      try {
        const tzOffset = new Date().getTimezoneOffset();
        const res = await fetch(`/api/typing?sender_id=${receiver.id}&receiver_id=${userId}&tz=${tzOffset}`);
        const data = await res.json();
        const typing = Boolean(data?.is_typing);

        if (data?.updated_at) {
          const updatedAt = new Date(data.updated_at).getTime();
          const now = Date.now();
          setIsTyping(now - updatedAt > 5000 ? false : typing);
        } else setIsTyping(false);
      } catch {
        setIsTyping(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userId, receiver?.id]);

  // ------------------------------------------------------
  // Fetch messages + receiver info
  // ------------------------------------------------------
  const fetchMessages = async () => {
    if (!userId || !receiverId) return;
    try {
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/messages/${receiverId}?sender_id=${userId}&tz=${tz}`);
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setReceiver(data.receiver || null);
      scrollToBottom(false);
    } catch (err) {
      console.error("Fetch messages error:", err);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();
    // we do not poll here; socket will deliver updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, receiverId]);

  // -----------------------------
  // Hide floater on outside click
  // -----------------------------
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (actionMenu.open && !target.closest("#actionMenu")) {
        setActionMenu((prev) => ({ ...prev, open: false }));
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [actionMenu.open]);

  // ------------------------------------------------------
  // Scroll helpers
  // ------------------------------------------------------
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  useLayoutEffect(() => {
    if (messages.length > 0) scrollToBottom(false);
  }, [messages.length]);

// ------------------------------------------------------
// ✅ Socket.IO — single listener setup (with safe connect + join)
// ------------------------------------------------------
useEffect(() => {
  if (!userId || !receiverId) return;

  const sender = Number(userId);
  const receiver = Number(receiverId);
  const roomId = sender < receiver ? `${sender}-${receiver}` : `${receiver}-${sender}`;

  console.log("🟡 [Socket Setup] Preparing socket for chat:", roomId);

  // ✅ ensure websocket transport & reconnection
  if (!socket.connected) {
    console.log("⚡ [Socket] Connecting...");
    socket.io.opts.transports = ["websocket"];
    socket.io.opts.reconnection = true;
    socket.io.opts.reconnectionAttempts = 5;
    socket.io.opts.reconnectionDelay = 2000;
    socket.connect();
  }

  // ✅ safely join room after connect
  const joinRoom = () => {
    socket.emit("joinRoom", { senderId: sender, receiverId: receiver });
    console.log(`🏠 [Socket] Joined private room: ${roomId}`);
  };

  if (socket.connected) joinRoom();
  else socket.once("connect", joinRoom);

  // ------------------------------------------------------
  // ✅ Handle new messages (real time)
  // ------------------------------------------------------
  const handleNewMessage = (msg: Message) => {
    console.log("📩 [Socket] message:new received:", msg);

    const isThisChat =
      (msg.sender_id === receiver && msg.receiver_id === sender) ||
      (msg.sender_id === sender && msg.receiver_id === receiver);

    if (isThisChat) {
      console.log("✅ [Socket] Message belongs to this conversation — updating UI");
      addOrUpdateMessage(msg);
      scrollToBottom();
    } else {
      console.log("🚫 [Socket] Ignored message (different conversation)");
    }
  };

    // ------------------------------------------------------
  // ✏️ Handle UPDATED messages
  // ------------------------------------------------------
  const handleUpdateMessage = (msg: Message) => {
    console.log("📝 [Socket] message:update received:", msg);
    addOrUpdateMessage(msg);
  };

   // ------------------------------------------------------
  // ❌ Handle DELETED messages
  // ------------------------------------------------------
  const handleDeleteMessage = (data: { id: number } | number) => {
    const id = typeof data === "number" ? data : data.id;
    console.log("🗑️ [Socket] message:delete received for id:", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

   // ------------------------------------------------------
  // 😍 Handle REACTIONS
  // ------------------------------------------------------
  const handleReaction = (data: { message_id: number; emoji_reactions: EmojiReaction[] }) => {
    console.log("😊 [Socket] message:reaction received:", data);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === data.message_id ? { ...m, emoji_reactions: data.emoji_reactions } : m
      )
    );
  };

    // ------------------------------------------------------
  // ↩️ Handle REPLY (same as new message)
  // ------------------------------------------------------
  const handleReply = (msg: Message) => {
    console.log("↩️ [Socket] message:reply received:", msg);
    handleNewMessage(msg);
  };


 // ------------------------------------------------------
  // ✅ Register all listeners
  // ------------------------------------------------------
  socket.on("message:new", handleNewMessage);
  socket.on("message:update", handleUpdateMessage);
  socket.on("message:delete", handleDeleteMessage);
  socket.on("message:reaction", handleReaction);
  socket.on("message:reply", handleReply);

  // ------------------------------------------------------
  // Connection logging
  // ------------------------------------------------------
  socket.on("connect", () => console.log("🟢 [Socket] Connected:", socket.id));
  socket.on("disconnect", (reason) => console.log("⚪ [Socket] Disconnected:", reason));
  socket.on("connect_error", (err) => console.warn("🔴 [Socket] Connection error:", err));

  // ------------------------------------------------------
  // 🧹 Cleanup when leaving
  // ------------------------------------------------------
  return () => {
    console.log("🧹 [Socket Cleanup] Leaving room:", roomId);
    socket.emit("leaveRoom", { senderId: sender, receiverId: receiver });
    socket.off("message:new", handleNewMessage);
    socket.off("message:update", handleUpdateMessage);
    socket.off("message:delete", handleDeleteMessage);
    socket.off("message:reaction", handleReaction);
    socket.off("message:reply", handleReply);
    socket.off("connect");
    socket.off("disconnect");
    socket.off("connect_error");
  };
}, [userId, receiverId]);



  // ------------------------------------------------------
  // File type detector
  // ------------------------------------------------------
  const detectMessageType = (f: File | null) => {
    if (!f) return "file";
    if (f.type.startsWith("image/")) return "image";
    if (f.type.startsWith("video/")) return "video";
    if (f.type.startsWith("audio/")) return "audio";
    return "file";
  };

  // ------------------------------------------------------
  // Emoji picker helper
  // ------------------------------------------------------
  const handleEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + (emojiData.native ?? emojiData.emoji ?? ""));
  };

// ------------------------------------------------------
// React to message (button / action menu)
// ------------------------------------------------------
const handleReact = async (messageId: number, emoji: string) => {
  if (!userId) return;
  try {
    const res = await fetch(`/api/messages/${messageId}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, user_id: userId }),
    });

    const updated = await res.json();

    if (res.ok && updated?.message_id) {
      // ✅ Emit to socket after successful reaction
      socket.emit("message:reaction", updated);
    }
  } catch (err) {
    console.error("Emoji reaction failed:", err);
  } finally {
    setActionMenu((prev) => ({ ...prev, open: false }));
  }
};


// ------------------------------------------------------
// Send message (supports edit + files)
// ------------------------------------------------------
const handleSend = async (e?: FormEvent) => {
  if (e) e.preventDefault();
  if (!userId || !receiverId) return showNotification("Select a friend");
  if (!newMessage && !file) return;

  setLoading(true);
  try {
    let res: Response;

    // ✏️ Edit existing message
    if (editingMessage) {
      res = await fetch(`/api/messages/${editingMessage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: editingMessage.id, content: newMessage }),
      });
      const updated = await res.json();

      if (updated?.message) {
        addOrUpdateMessage(updated.message);
        // ✅ Emit to socket for other users
        socket.emit("message:update", updated.message);
      }

      setEditingMessage(null);
      setNewMessage("");
      showNotification("Message updated ✅");
      return;
    }

    // 📎 File upload or text message
    if (file) {
      const formData = new FormData();
      formData.append("sender_id", String(userId));
      formData.append("message_type", detectMessageType(file));
      formData.append("file", file);
      if (newMessage) formData.append("content", newMessage);
      if (replyTo) formData.append("reply_to_id", String(replyTo.id));
      res = await fetch(`/api/messages/${receiverId}`, { method: "POST", body: formData });
    } else {
      res = await fetch(`/api/messages/${receiverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: userId,
          content: newMessage,
          message_type: "text",
          reply_to_id: replyTo?.id || null,
        }),
      });
    }

    const payload = await res.json();
    if (res.ok) {
      if (payload && payload.id) {
        addOrUpdateMessage(payload);
        // ✅ Emit new message to socket
        socket.emit("message:new", payload);
      }

      setNewMessage("");
      setFile(null);
      setReplyTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      scrollToBottom();
      updateTypingStatus(false);
    } else {
      showNotification(payload?.error || "Failed to send message");
    }
  } catch (err) {
    console.error("Send message error:", err);
    showNotification("Server error");
  } finally {
    setLoading(false);
  }
};


// ------------------------------------------------------
// Delete message
// ------------------------------------------------------
const handleDelete = async (id: number) => {
  if (!confirm("Delete this message?")) return;
  try {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      showNotification("Message deleted 🗑️");

      // ✅ Emit real-time delete
      if (userId && receiverId) {
        socket.emit("message:delete", { id, sender_id: userId, receiver_id: Number(receiverId) });
      }
    } else {
      const err = await res.json();
      showNotification(err?.error || "Failed to delete message");
    }
  } catch (err) {
    console.error("Delete message error:", err);
    showNotification("Server error");
  }
};

  // ------------------------------------------------------
  // Render attachment
  // ------------------------------------------------------
  const renderAttachment = (msg: Message) => {
    if (!msg.file_path) return null;
    switch (msg.message_type) {
      case "image":
        return (
          <Image
            src={msg.file_path}
            alt={msg.file_name || "Image"}
            width={200}
            height={200}
            className="rounded-lg mt-2 cursor-pointer"
            onClick={() => setPreviewPostImage(msg.file_path!)}
          />
        );
      case "video":
        return (
          <video controls className="mt-2 rounded-lg max-w-full">
            <source src={msg.file_path} />
          </video>
        );
      case "audio":
        return (
          <audio controls className="mt-2 w-full">
            <source src={msg.file_path} />
          </audio>
        );
      default:
        return (
          <a href={msg.file_path} target="_blank" rel="noopener noreferrer" className="mt-2 block text-blue-400 underline">
            {msg.file_name || "Download file"}
          </a>
        );
    }
  };

  const renderAttachmentWithPreview = (msg: Message) => renderAttachment(msg);

  const cancelFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!newMessage.trim()) updateTypingStatus(false);
  };

  // Reply preview
  const renderReplyPreview = () => {
    if (!replyTo) return null;
    const senderName = replyTo.sender_id === userId ? "You" : receiver?.username;
    return (
      <div className="bg-white/10 border-l-4 border-pink-500 p-2 mb-2 rounded-md text-xs text-gray-300 flex justify-between items-center">
        <div>
          <span className="font-semibold">{senderName}:</span> {replyTo.content || <em>Attachment</em>}
        </div>
        <button className="text-red-400 hover:text-red-500 ml-2" onClick={() => setReplyTo(null)}>
          ✖
        </button>
      </div>
    );
  };

// -------------------------
// Render
// -------------------------
return (
  <main className="relative h-screen flex flex-col bg-gray-900 text-gray-200">
    {/* Header */}
    <header className="sticky top-0 bg-gray-900/95 backdrop-blur-md z-20 px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
        >
          <ArrowLeft size={20} />
        </button>

        {receiver && (
          <div className="flex items-center gap-3 truncate">
            <div className="relative w-10 h-10 flex-shrink-0">
              {receiver.photo ? (
                <Image
                  src={receiver.photo}
                  alt={receiver.username}
                  fill
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-semibold">
                  {receiver.username.charAt(0).toUpperCase()}
                </div>
              )}
              {receiver.isOnline && !isTyping && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-900 rounded-full animate-pulse"></span>
              )}
            </div>

            <div className="flex flex-col truncate">
              <span className="font-bold text-sm sm:text-lg truncate">{receiver.username}</span>
              {isTyping ? (
                <span className="text-[10px] text-green-400">Typing...</span>
              ) : receiver.isOnline ? (
                <span className="text-[10px] text-green-400">Online</span>
              ) : receiver.last_active_local ? (
                <span className="text-[10px] text-gray-400 truncate">
                  Last seen{" "}
                  {new Date(receiver.last_active_local ?? receiver.last_active).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateToCall("audio")}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition"
        >
          <Phone size={20} />
        </button>
        <button
          onClick={() => navigateToCall("video")}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition"
        >
          <Video size={20} />
        </button>
      </div>


    </header>

    {/* Scroll To Bottom */}
    {showScrollButton && (
      <button
        onClick={() => scrollToBottom()}
        className="fixed bottom-24 right-4 bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-full shadow-lg z-30 transition"
      >
        ↓
      </button>
    )}


{/* 💬 Messages Container */}
<div
  ref={messagesContainerRef}
  onScroll={handleScroll}
  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-gray-900/70"
>
  {messages.length === 0 && !isTyping && (
    <p className="text-center text-gray-500 mt-10 italic">
      No messages yet. Say hi 👋
    </p>
  )}

  {Object.entries(
    messages.reduce((acc: Record<string, Message[]>, msg) => {
      const baseDate = msg.created_at_local ?? msg.created_at;
      const dateKey = new Date(baseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(msg);
      return acc;
    }, {})
  ).map(([date, msgs]) => (
    <div key={date} className="space-y-4">
      {/* 🗓️ Date Header */}
      <div className="text-center text-xs text-gray-400">
        <span className="px-3 py-1 bg-gray-800/80 rounded-full border border-gray-700 shadow-sm">
          {date === new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
            ? "Today"
            : date ===
              new Date(Date.now() - 86400000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })
            ? "Yesterday"
            : date}
        </span>
      </div>

      {msgs.map((msg) => {
        const isMine = msg.sender_id === userId;
        const baseDate = msg.created_at_local ?? msg.created_at;

        return (
          <motion.div
            key={msg.id}
            id={`message-${msg.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
          >
            {/* 👤 Avatar */}
            {!isMine && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {receiver?.photo ? (
                  <Image
                    src={receiver.photo}
                    alt={receiver.username}
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-semibold">
                    {receiver?.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}

            {/* 💬 Message Bubble */}
            <div
              className={`relative max-w-[85%] sm:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all ${
                isMine
                  ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                  : "bg-white/5 text-gray-100 border border-white/10"
              }`}
            >
              {/* ⋯ Action button */}
              <div
                className={`absolute ${isMine ? "-left-8" : "-right-8"} top-1/2 -translate-y-1/2`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActionMenu({
                      open: true,
                      msg,
                      x: rect.left,
                      y: rect.bottom + 8,
                    });
                  }}
                  className="p-1 rounded-full bg-gray-800/80 hover:bg-gray-700 transition shadow-md sm:opacity-80 sm:group-hover:opacity-100"
                  title="More options"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6h.01M12 12h.01M12 18h.01"
                    />
                  </svg>
                </button>
              </div>

              {/* 🧩 Reply Preview */}
              {msg.reply_to_id && (
                <div
                  onClick={() => {
                    const el = document.getElementById(`message-${msg.reply_to_id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("bg-pink-900/40");
                      setTimeout(() => el.classList.remove("bg-pink-900/40"), 1200);
                    }
                  }}
                  className={`mb-2 p-2 rounded-md text-xs cursor-pointer transition ${
                    isMine
                      ? "bg-white/10 border-l-4 border-white/30"
                      : "bg-gray-800/50 border-l-4 border-pink-500"
                  }`}
                >
                  <span className="block font-semibold truncate">
                    {msg.reply_sender_id === userId ? "You" : receiver?.username}
                  </span>
                  <span className="block text-gray-300 truncate">
                    {msg.reply_content || <em>Attachment</em>}
                  </span>
                </div>
              )}

              {/* ✉️ Message Content */}
              {msg.content && (
                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                  {msg.content}
                </div>
              )}

              {/* 📎 Attachments */}
              {renderAttachmentWithPreview(msg)}

              {/* 😍 Emoji Reactions */}
              {(msg.emoji_reactions ?? []).length > 0 && (
  <div className="flex gap-1 mt-1 flex-wrap relative">
    {(msg.emoji_reactions ?? []).map((e, i) => {
      const sameEmojiReactions = (msg.emoji_reactions ?? []).filter(
        (r) => r.emoji === e.emoji
      );

      const showUsers =
        reactionInfo.visible &&
        reactionInfo.msgId === msg.id &&
        reactionInfo.emoji === e.emoji;

      return (
        <div key={`${e.emoji}-${i}`} className="relative">
          {/* 😍 Emoji Button */}
          <span
            className="text-sm cursor-pointer select-none hover:scale-110 transition-transform"
            onClick={(ev) => {
              ev.stopPropagation();
              if (showUsers) {
                setReactionInfo({
                  visible: false,
                  emoji: null,
                  msgId: null,
                  users: [],
                });
              } else {
                setReactionInfo({
                  visible: true,
                  emoji: e.emoji,
                  msgId: msg.id,
                  users: sameEmojiReactions.map((r) => ({
                    user_id: r.user_id,
                    username: r.username ?? "Unknown",
                  })),
                });
              }
            }}
          >
            {e.emoji}
          </span>

          {/* 👤 Floating Username Popover */}
          {showUsers && sameEmojiReactions.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-6 bg-gray-800/95 text-gray-200 text-[11px] rounded-xl px-3 py-2 shadow-lg z-50 whitespace-nowrap backdrop-blur-md border border-white/10">
              {sameEmojiReactions.map((r, idx) => (
                <div key={r.user_id || idx}>{r.username ?? "Unknown"}</div>
              ))}

              {/* ▲ Small triangle pointer (above the tooltip) */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800/95"></div>
            </div>
          )}
        </div>
      );
    })}
  </div>
)}

              {/* 🕒 Footer */}
              <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                  <span>
                    {new Date(baseDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.edited && (
                    <span className="italic text-gray-400">(edited)</span>
                  )}
                </div>
                {!isMine && (
                  <button
                    onClick={() => setReplyTo(msg)}
                    className="text-pink-400 hover:text-pink-500 ml-2 transition"
                    title="Reply"
                  >
                    ↩ Reply
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  ))}

  <div ref={messagesEndRef} />
</div>



{/* 🎛️ Action Menu */}
{actionMenu.open && (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 30 }}
    transition={{ duration: 0.2 }}
    className={`fixed z-50 bg-gray-900/95 text-white rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md ${
      window.innerWidth < 640
        ? "bottom-4 left-1/2 transform -translate-x-1/2 w-[92%] p-3"
        : "p-3"
    }`}
    style={
      window.innerWidth >= 640
        ? {
            top: Math.min(actionMenu.y ?? 0, window.innerHeight - 200),
            left: Math.min(actionMenu.x ?? 0, window.innerWidth - 220),
            width: "180px",
          }
        : {}
    }
  >
    {/* 😍 Scrollable Emoji Reactions */}
    <div className="flex overflow-x-auto gap-3 border-b border-gray-800 pb-2 no-scrollbar">
      {["😍", "😂", "😢", "👍", "👎", "❤️", "🔥", "👏", "😮", "🤔", "🥰"].map((emoji) => (
        <button
          key={emoji}
          onClick={() => actionMenu.msg && handleReact(actionMenu.msg.id, emoji)}
          className="text-2xl hover:scale-125 transition-transform flex-shrink-0"
        >
          {emoji}
        </button>
      ))}
    </div>

    {/* Actions */}
    <div className="flex flex-col gap-2 mt-3">
      <button
        onClick={() => actionMenu.msg && setReplyTo(actionMenu.msg)}
        className="text-left px-2 py-2 rounded-lg bg-gray-800/70 hover:bg-pink-600/60 transition text-sm"
      >
        ↩ Reply
      </button>

      {actionMenu.msg?.sender_id === userId && (
        <>
          <button
            onClick={() => {
              if (!actionMenu.msg) return;
              setEditingMessage(actionMenu.msg);
              setNewMessage(actionMenu.msg.content || "");
              setActionMenu((prev) => ({ ...prev, open: false }));
              setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.setSelectionRange(
                  inputRef.current.value.length,
                  inputRef.current.value.length
                );
              }, 100);
            }}
            className="text-left px-2 py-2 rounded-lg bg-gray-800/70 hover:bg-blue-600/60 transition text-sm"
          >
            ✏️ Edit
          </button>

          <button
            onClick={() => actionMenu.msg && handleDelete(actionMenu.msg.id)}
            className="text-left px-2 py-2 rounded-lg bg-gray-800/70 hover:bg-red-600/60 transition text-sm"
          >
            🗑️ Delete
          </button>
        </>
      )}

      <button
        onClick={() => setActionMenu((prev) => ({ ...prev, open: false }))}
        className="text-left text-gray-400 hover:text-white transition text-sm"
      >
        ❌ Cancel
      </button>
    </div>
  </motion.div>
)}





{/* ✨ Message Input Section */}
<form
  onSubmit={handleSend}
  className="relative bg-gray-900/95 border-t border-white/10 px-4 py-3 flex flex-col"
>
  {renderReplyPreview()}

  {/* File preview */}
  {file && (
    <div className="flex items-center justify-between bg-white/10 rounded-md p-2 mb-2">
      <p className="text-sm text-gray-300 truncate max-w-[200px]">{file.name}</p>
      <button
        type="button"
        onClick={cancelFile}
        className="text-red-400 hover:text-red-500"
      >
        <X size={14} />
      </button>
    </div>
  )}

  {/* Input row */}
  <div className="flex items-center gap-3">
    {/* Emoji Picker */}
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowEmojiPicker((prev) => !prev)}
        className="p-2 text-gray-400 hover:text-white"
      >
        <Smile size={20} />
      </button>
      {showEmojiPicker && (
        <div className="absolute bottom-12 left-0 z-50">
          <Picker
            data={data}
            onEmojiSelect={(emoji: { native: string }) =>
              setNewMessage((prev) => prev + emoji.native)
            }
            theme="dark"
          />
        </div>
      )}
    </div>

    {/* File upload */}
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        id="fileUpload"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />
      <label
        htmlFor="fileUpload"
        className="cursor-pointer text-gray-400 hover:text-white"
      >
        <Paperclip size={20} />
      </label>
    </div>

    {/* Text input */}
    <input
      ref={inputRef}
      type="text"
      value={newMessage}
      onChange={handleTyping}
      placeholder={
        editingMessage
          ? "Editing message..."
          : replyTo
          ? "Replying..."
          : "Type a message..."
      }
      className="flex-1 bg-transparent border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-white placeholder-gray-500"
    />

    {/* Send button */}
    <button
      type="submit"
      disabled={loading}
      className="p-2 bg-pink-600 hover:bg-pink-700 rounded-full text-white transition disabled:opacity-50"
    >
      <Send size={18} />
    </button>
  </div>
</form>


    {/* Image Preview */}
    <AnimatePresence>
      {previewPostImage && (
        <motion.div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPreviewPostImage(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative w-full max-w-2xl h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={previewPostImage} alt="Preview" fill className="object-contain rounded-xl" />
            <div
              className="absolute top-4 right-4 text-white cursor-pointer text-2xl font-bold"
              onClick={() => setPreviewPostImage(null)}
            >
              ✖
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </main>
);

}
