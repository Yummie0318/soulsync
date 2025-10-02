"use client";


import { useNotification } from "@/context/NotificationContext";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, useRef, useLayoutEffect, FormEvent } from "react";


type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  message_type: string;
  file_name: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
};

type Friend = {
  id: number;
  username: string;
  photo?: string | null;
  address?: string | null;
  age?: number | null;
  quote?: string | null;
};

export default function ChatPage({ params }: { params?: { id?: string } }) {
  const { showNotification } = useNotification();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(null);

  // menu state for message actions
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  // client-only states
  const [userId, setUserId] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [receiverId, setReceiverId] = useState<number | null>(() =>
    params?.id ? Number(params.id) || null : null
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  // ✅ Scroll listener to toggle button
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollButton(!nearBottom);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // —————— load userId from localStorage
  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    if (stored) {
      setUserId(Number(stored));
    }
  }, []);

  // —————— fetch friends
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/friends/${userId}?locale=en`);
        const data = await res.json();
        if (!mounted) return;
        setFriends(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load friends:", err);
        setFriends([]);
      }
    };
    fetchFriends();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // —————— fetch messages
  const fetchMessages = async (rid: number | null) => {
    if (!userId || !rid) {
      setMessages([]);
      return;
    }

    try {
      const res = await fetch(`/api/messages/${rid}?sender_id=${userId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!userId) return;
    if (receiverId) {
      fetchMessages(receiverId);
    } else {
      setMessages([]);
    }
  }, [userId, receiverId]);

  useEffect(() => {
    if (!userId || !receiverId) return;
    const interval = setInterval(() => {
      fetchMessages(receiverId);
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, receiverId]);

  // ✅ Auto-scroll when messages change
  useLayoutEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false); // no smooth on first load
    }
  }, [messages.length]);
  

  // —————— handle friend click
  const handleSelectFriend = (f: Friend) => {
    setReceiverId(f.id);
    fetchMessages(f.id);
  };

  // —————— detect file type
  const detectMessageType = (f: File | null) => {
    if (!f) return "file";
    if (f.type.startsWith("image/")) return "image";
    if (f.type.startsWith("video/")) return "video";
    if (f.type.startsWith("audio/")) return "audio";
    return "file";
  };

  // —————— send message
  const handleSend = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!userId || !receiverId) {
      showNotification("Select a friend to send a message");
      return;
    }
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
          }),
        });
      }

      const payload = await res.json();
      if (!res.ok) {
        showNotification(payload?.error || "Failed to send message");
      } else {
        const created: Message = Array.isArray(payload) ? payload[0] : payload;
        if (created && typeof created.id === "number") {
          setMessages((prev) => [...prev, created]);
        } else {
          await fetchMessages(receiverId);
        }
        setNewMessage("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        scrollToBottom(); // ✅ smooth scroll on send
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      showNotification("Server error");
    } finally {
      setLoading(false);
    }
  };

  // —————— start call
  const handleStartCall = async (type: "voice" | "video" = "voice") => {
    if (!userId || !receiverId) {
      showNotification("Select a friend to call");
      return;
    }
    try {
      const res = await fetch(`/api/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller_id: userId,
          receiver_id: receiverId,
          call_type: type,
        }),
      });
      if (res.ok) {
        showNotification(
          type === "video" ? "🎥 Video call started" : "📞 Call started"
        );
      } else {
        showNotification("Failed to start call");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to start call");
    }
  };

  // —————— message menu actions
  const toggleMenu = (id: number) => {
    setMenuOpen((prev) => (prev === id ? null : id));
  };

  const handleEditMessage = (msg: Message) => {
    console.log("Edit message:", msg);
    showNotification("Edit feature not implemented yet");
  };

  const handleDeleteMessage = (id: number) => {
    console.log("Delete message id:", id);
    showNotification("Delete feature not implemented yet");
  };

  // —————— filtered friends
  const visibleFriends = friends.filter((f) =>
    `${f.username}`.toLowerCase().includes(search.toLowerCase())
  );

 return (
  <main className="relative h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 overflow-hidden">
    {/* Background glow */}
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-300" />
    </div>

    {/* Sidebar */}
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-white/5 backdrop-blur-md p-4 border-r border-white/10
        transform transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h3 className="text-lg font-bold">Friends</h3>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✖
        </button>
      </div>

      <div className="hidden lg:block mb-4">
        <h3 className="text-lg font-bold">Friends</h3>
        <p className="text-xs text-gray-300">Tap a friend to start chat</p>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 placeholder-gray-400 text-sm"
        />
      </div>

      {/* Friends list */}
      <div className="overflow-y-auto space-y-2 max-h-[calc(100vh-200px)] pr-1">
        {visibleFriends.length === 0 ? (
          <p className="text-sm text-gray-400">No friends found</p>
        ) : (
          visibleFriends.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                handleSelectFriend(f);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition relative
                ${
                  receiverId === f.id
                    ? "ring-2 ring-pink-500 bg-gradient-to-r from-pink-600/10 to-purple-600/10 shadow-md"
                    : "hover:bg-white/6"
                }`}
            >
              {f.photo ? (
                <Image
                  src={f.photo}
                  alt={f.username}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">
                  {f.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="flex-1">
                <span className="font-medium">{f.username}</span>
                <p className="text-xs text-gray-400 truncate">
                  {f.address || f.quote || ""}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 hidden lg:block">
        Tip: click a friend to open the chat. Search works instantly.
      </div>
    </aside>

    {/* Chat Panel */}
    <section className="flex-1 flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-300 hover:text-white"
          >
            ☰
          </button>

          {receiverId ? (
            (() => {
              const sel = friends.find((f) => f.id === receiverId);
              return (
                <>
                  {sel?.photo ? (
                    <Image
                      src={sel.photo}
                      alt={sel.username}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-semibold">
                      {sel?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div>
                    <div className="font-bold">
                      {sel?.username || `User ${receiverId}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      {sel?.address || sel?.quote || ""}
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="text-gray-400">Select a friend to start chatting</div>
          )}
        </div>

        {/* Actions */}
        {receiverId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartCall("voice")}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm shadow"
            >
              📞
            </button>
            <button
              onClick={() => handleStartCall("video")}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm shadow"
            >
              🎥
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        >
        {Array.isArray(messages) && messages.length > 0 ? (
          messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {/* Message bubble */}
                <div
                  className={`max-w-[80%] sm:max-w-md p-3 rounded-2xl shadow-lg
                    ${
                      isMine
                        ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                        : "bg-white/5 text-gray-100 border border-white/6"
                    }`}
                >
                  {msg.message_type === "text" && (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Media */}
                  {(msg.message_type === "image" || msg.message_type === "video") &&
                    msg.file_path && (
                      <div className="relative space-y-2">
                        {msg.message_type === "image" ? (
                          <img
                            src={msg.file_path}
                            alt={msg.file_name || "image"}
                            className="rounded-lg max-w-full sm:max-w-[320px] object-cover cursor-pointer hover:opacity-90"
                            onClick={() => {
                              setPreviewMedia(msg.file_path);
                              setPreviewType("image");
                              setIsModalOpen(true);
                            }}
                          />
                        ) : (
                          <video
                            controls
                            src={msg.file_path}
                            className="rounded-lg max-w-full sm:max-w-[420px] cursor-pointer"
                            onClick={() => {
                              setPreviewMedia(msg.file_path);
                              setPreviewType("video");
                              setIsModalOpen(true);
                            }}
                          />
                        )}
                        {msg.content && (
                          <p className="whitespace-pre-wrap text-sm mt-2">{msg.content}</p>
                        )}
                      </div>
                    )}

                  {msg.message_type === "audio" && msg.file_path && (
                    <div className="space-y-2">
                      <audio controls src={msg.file_path} />
                      {msg.content && (
                        <p className="whitespace-pre-wrap text-sm mt-2">{msg.content}</p>
                      )}
                    </div>
                  )}

                  {msg.message_type === "file" && msg.file_path && (
                    <div className="space-y-2">
                      <a
                        href={msg.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-blue-300"
                      >
                        📎 {msg.file_name}
                      </a>
                      {msg.content && (
                        <p className="whitespace-pre-wrap text-sm mt-1">{msg.content}</p>
                      )}
                    </div>
                  )}

                  {/* TIME */}
                  <div className="mt-1 text-xs text-gray-300">
                    {new Date(msg.created_at).toLocaleString()}
                  </div>
                </div>

                {/* ⋮ Menu on the side */}
                {isMine && (
                  <div className="relative">
                    <button
                     onClick={() => setMenuOpen(menuOpen === msg.id ? null : msg.id)}
                      className="p-1 rounded-full bg-black/40 hover:bg-black/70 text-white"
                    >
                      ⋮
                    </button>
                    {menuOpen === msg.id && (
                      <div className="absolute right-0 mt-2 w-28 bg-gray-800 text-sm rounded shadow-lg z-50">
                        <button
                          onClick={() => handleEditMessage(msg)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-700"
                        >
                          ✏ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="w-full px-3 py-2 text-left text-red-400 hover:bg-gray-700"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="text-center text-gray-400 mt-8">
            No messages yet. Say hi 👋
          </div>
        )}
       <div ref={messagesEndRef} />
      </div>


      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 bg-white/5 border-t border-white/10"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={receiverId ? "Type a message..." : "Select a friend to chat"}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!receiverId}
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />

          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            disabled={!receiverId}
          />
          <label
            htmlFor="file-upload"
            className={`px-3 py-2 rounded-lg bg-gray-700 cursor-pointer ${
              !receiverId ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            📎
          </label>

          <button
            type="submit"
            disabled={!receiverId || loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold shadow"
          >
            ➤
          </button>
        </div>

        {file && (
          <div className="mt-2 p-2 bg-gray-800 rounded flex items-center justify-between text-sm">
            <div className="truncate">📎 {file.name}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-400"
              >
                ✖
              </button>
            </div>
          </div>
        )}
      </form>
    </section>

    {/* -------------------- Preview Modal -------------------- */}
    <AnimatePresence>
      {isModalOpen && previewMedia && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative w-full max-w-3xl h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {previewType === "image" ? (
              <img
                src={previewMedia}
                alt="Preview"
                className="object-contain rounded-xl max-h-full max-w-full"
              />
            ) : (
              <video
                src={previewMedia}
                controls
                autoPlay
                className="object-contain rounded-xl max-h-full max-w-full"
              />
            )}
            <div
              className="absolute top-4 right-4 text-white cursor-pointer"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
        {showScrollButton && (
            <motion.button
                key="scroll-btn"
                onClick={() => scrollToBottom()} // ✅ wrap it
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-24 right-6 z-20 p-3 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:scale-105"
                >
                ⬇
                </motion.button>

        )}
</AnimatePresence>

  </main>
);

  
}
