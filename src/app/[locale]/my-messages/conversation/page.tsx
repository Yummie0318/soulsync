"use client";

import { useNotification } from "@/context/NotificationContext";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, Paperclip } from "lucide-react";
import { useEffect, useState, useRef, useLayoutEffect, FormEvent } from "react";
import { useSearchParams, useRouter,useParams } from "next/navigation";


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
  // Reply fields from API
  reply_to_id?: number | null;
  reply_content?: string | null;
  reply_sender_id?: number | null;
};



type User = {
  id: number;
  username: string;
  photo?: string | null;
  isOnline?: boolean;
  last_active?: string;
  last_active_local?: string;
};

type Reply = {
  id: number;
  content: string | null;
  sender_id: number;
} | null;


export default function ConversationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  const receiverId = params.get("receiverId");

  const { locale } = useParams(); // get current locale

  const [userId, setUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiver, setReceiver] = useState<User | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [previewPostImage, setPreviewPostImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const [replyTo, setReplyTo] = useState<Message | null>(null); // ✅ Reply state



  const navigateToCall = (type: "audio" | "video") => {
    if (!userId || !receiverId) return;

    // include locale in the route
    router.push(
      `/${locale}/my-messages/call?callerId=${userId}&receiverId=${receiverId}&type=${type}`
    );
  };


    // -------------------------
  // Load current user ID
  // -------------------------
  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (stored) setUserId(Number(stored));
  }, []);


  // -------------------------
  // Typing handling (send)
  // -------------------------
  const updateTypingStatus = (typing: boolean) => {
    if (!userId || !receiver?.id) return;
    fetch("/api/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: userId,
        receiver_id: receiver.id,
        is_typing: typing,
      }),
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
    }, 5000); // auto-reset after 5s
  };

  useEffect(() => {
    const typingNow = newMessage.trim() !== "" || !!file;
    updateTypingStatus(typingNow);

    if (!typingNow && typingTimeout.current) clearTimeout(typingTimeout.current);
    if (!typingNow) {
      typingTimeout.current = setTimeout(() => updateTypingStatus(false), 500);
    }
  }, [file]);

  // ------------------------- // Scroll helpers // -------------------------
  const handleScroll = () => { 
    const container = messagesContainerRef.current; if (!container) return;
     const isAtBottom = container.scrollHeight - container.scrollTop - 
     container.clientHeight < 100;
      setShowScrollButton(!isAtBottom); 
    };

  // -------------------------
// Fetch typing status (receive)
// -------------------------
// -------------------------
// Fetch typing status from API (other user)
// -------------------------
useEffect(() => {
  if (!userId || !receiver?.id) return;

  const interval = setInterval(async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset(); // in minutes
      const res = await fetch(
        `/api/typing?sender_id=${receiver.id}&receiver_id=${userId}&tz=${tzOffset}`
      );
      const data = await res.json();

      // console.log("Polling typing API:", {
      //   sender_id: receiver.id,
      //   receiver_id: userId,
      //   data,
      //   now: new Date().toISOString(),
      // });

      const typing = Boolean(data?.is_typing);

      if (data?.updated_at) {
        const updatedAt = new Date(data.updated_at).getTime();
        const now = Date.now();

        if (now - updatedAt > 5000) {
          setIsTyping(false);
        } else {
          setIsTyping(typing);
        }
      } else {
        setIsTyping(false);
      }
    } catch (err) {
      // console.error("Typing API error:", err);
      setIsTyping(false);
    }
  }, 1000);

  return () => clearInterval(interval);
}, [userId, receiver?.id]);



  // -------------------------
  // Fetch messages + receiver
  // -------------------------
  const fetchMessages = async () => {
    if (!userId || !receiverId) return;
    try {
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/messages/${receiverId}?sender_id=${userId}&tz=${tz}`);
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setReceiver(data.receiver || null);
    } catch (err) {
      console.error(err);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [userId, receiverId]);

  // -------------------------
  // Scroll helpers
  // -------------------------
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useLayoutEffect(() => {
    if (messages.length > 0) scrollToBottom(false);
  }, [messages.length]);

  // -------------------------
  // Message type detection
  // -------------------------
  const detectMessageType = (f: File | null) => {
    if (!f) return "file";
    if (f.type.startsWith("image/")) return "image";
    if (f.type.startsWith("video/")) return "video";
    if (f.type.startsWith("audio/")) return "audio";
    return "file";
  };

  // -------------------------
  // Send message
  // -------------------------
  const handleSend = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!userId || !receiverId) return showNotification("Select a friend");
    if (!newMessage && !file) return;
  
    setLoading(true);
    try {
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append("sender_id", String(userId));
        formData.append("message_type", detectMessageType(file));
        formData.append("file", file);
        if (newMessage) formData.append("content", newMessage);
        if (replyTo) formData.append("reply_to_id", String(replyTo.id)); // ✅ FIXED
        res = await fetch(`/api/messages/${receiverId}`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`/api/messages/${receiverId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_id: userId,
            content: newMessage,
            message_type: "text",
            reply_to_id: replyTo?.id || null, // ✅ FIXED
          }),
        });
      }
  
      const payload = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, payload]);
        setNewMessage("");
        setFile(null);
        setReplyTo(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        scrollToBottom();
        updateTypingStatus(false);
      } else showNotification(payload?.error || "Failed to send message");
    } catch (err) {
      console.error(err);
      showNotification("Server error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Render attachment
  // -------------------------
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
          <a
            href={msg.file_path}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-blue-400 underline"
          >
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

// -------------------------
  // Input area with reply preview
  // -------------------------
  const renderReplyPreview = () => {
    if (!replyTo) return null;
    const senderName = replyTo.sender_id === userId ? "You" : receiver?.username;
    return (
      <div className="bg-white/10 border-l-4 border-pink-500 p-2 mb-2 rounded-md text-xs text-gray-300 flex justify-between items-center">
        <div>
          <span className="font-semibold">{senderName}:</span> {replyTo.content || <em>Attachment</em>}
        </div>
        <button
          className="text-red-400 hover:text-red-500 ml-2"
          onClick={() => setReplyTo(null)}
        >
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
<div className="sticky top-0 bg-gray-900/95 backdrop-blur-md z-20 px-4 py-3 border-b border-white/10 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <button
      onClick={() => router.back()}
      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
    >
      <ArrowLeft size={20} />
    </button>
    {receiver && (
      <div className="flex items-center gap-2 truncate">
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
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-gray-900 animate-pulse"></span>
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
              Last login:{" "}
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

  
</div>

{/* Scroll to Bottom Button */}
{showScrollButton && (
  <button
    onClick={() => scrollToBottom()}
    className="fixed bottom-24 right-4 bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-full shadow-lg z-30"
  >
    ↓
  </button>
)}


{/* Messages */}
<div
  ref={messagesContainerRef}
  onScroll={handleScroll}
  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-6 sm:space-y-8"
>
  {/* Empty state */}
  {messages.length === 0 && !isTyping && (
    <p className="text-center text-gray-400 mt-8">No messages yet. Say hi 👋</p>
  )}

  {/* Group messages by date */}
  {(() => {
    const groups: { [date: string]: typeof messages } = {};
    messages.forEach((msg) => {
      const baseDate = msg.created_at_local ?? msg.created_at;
      const dateKey = new Date(baseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });

    return Object.entries(groups).map(([date, msgs]) => (
      <div key={date} className="space-y-4">
        {/* Date Separator */}
        <div className="text-center text-xs text-gray-400 relative">
          <span className="px-3 py-1 bg-gray-800 rounded-full border border-gray-700">
            {date === new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })
              ? "Today"
              : date === new Date(Date.now() - 86400000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })
              ? "Yesterday"
              : date}
          </span>
        </div>

        {/* Messages inside group */}
        {msgs.map((msg) => {
          const isMine = msg.sender_id === userId;
          const baseDate = msg.created_at_local ?? msg.created_at;

          return (
            <motion.div
              key={msg.id}
              id={`message-${msg.id}`} // ✅ anchor for scrolling
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar */}
              {!isMine && receiver && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {receiver.photo ? (
                    <Image
                      src={receiver.photo}
                      alt={receiver.username}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold">
                      {receiver.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`max-w-[85%] sm:max-w-md px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-lg break-words transition-colors duration-500 ${
                  isMine
                    ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                    : "bg-white/5 text-gray-100 border border-white/10"
                }`}
              >
                {/* Reply preview inside bubble */}
                {msg.reply_to_id && (
                  <div
                    onClick={() => {
                      const el = document.getElementById(`message-${msg.reply_to_id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        // 🔥 Flash background instead of border
                        el.classList.add("bg-pink-900/40");
                        setTimeout(() => el.classList.remove("bg-pink-900/40"), 1200);
                      }
                    }}
                    className={`mb-2 p-2 rounded-md text-xs sm:text-sm cursor-pointer hover:opacity-80 transition ${
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

                {/* Content */}
                {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}

                {/* Attachment */}
                {renderAttachmentWithPreview(msg)}

                {/* Footer (timestamp + reply btn) */}
                <div className="flex justify-between items-center mt-1">
                  <div className="text-[10px] sm:text-xs text-gray-400">
                    {new Date(baseDate).toLocaleString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                  {!isMine && (
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="text-[10px] text-pink-400 hover:text-pink-500 ml-2 transition"
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
    ));
  })()}

  <div ref={messagesEndRef} />
</div>

    {/* Input area */}
    <form
      onSubmit={handleSend}
      className="p-3 sm:p-4 bg-white/5 border-t border-white/10 flex flex-col gap-2"
    >
      {/* Attached file preview */}
      {file && (
        <div className="flex items-center bg-white/10 px-2 py-1 rounded-lg max-w-full sm:max-w-md">
          <span className="text-xs sm:text-sm truncate">{file.name}</span>
          <button
            type="button"
            onClick={cancelFile}
            className="ml-2 text-white bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
          >
            ✖
          </button>
        </div>
      )}

      {/* ✅ Reply banner (compact + no overlap) */}
      {replyTo && (
        <div className="flex items-center justify-between bg-pink-600/10 border-l-4 border-pink-500 p-2 rounded-md">
          <div className="flex flex-col text-xs text-gray-200 overflow-hidden">
            <span className="font-semibold truncate">
              Replying to {replyTo.sender_id === userId ? "You" : receiver?.username}
            </span>
            <span className="truncate text-gray-300">
              {replyTo.content || <em>Attachment</em>}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="ml-2 text-gray-300 hover:text-white text-sm px-2"
            title="Cancel reply"
          >
            ✖
          </button>
        </div>
      )}

      {/* Input + Send */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleTyping}
          className="flex-1 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />

        <label
          htmlFor="fileInput"
          className="cursor-pointer p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
        >
          <Paperclip size={20} />
        </label>
        <input
          type="file"
          id="fileInput"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            if (selected) updateTypingStatus(true);
          }}
        />

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold shadow hover:opacity-90 transition"
        >
          ➤
        </button>
      </div>
    </form>


    {/* Preview Modal */}
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
