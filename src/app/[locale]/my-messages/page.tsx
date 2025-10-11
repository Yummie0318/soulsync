"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

type Friend = {
  id: number;
  username: string;
  photo?: string | null;
  last_active?: string | null;
  last_active_local?: string | null;
  isOnline?: boolean;
};

type Conversation = {
  id: number;
  user: Friend;
  lastMessage: string;
  message_type?: string; // "text" | "file" | "call"
  call_type?: "audio" | "video" | null;
  call_status?: "missed" | "ended" | "incoming" | "ongoing" | "cancelled" | null;
  unreadCount?: number;
  updatedAt: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const { showNotification } = useNotification();

  const [userId, setUserId] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  // 🧍 Get user id
  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (stored) setUserId(Number(stored));
  }, []);

  // 🟢 Keep user online
  useEffect(() => {
    if (!userId) return;
    const pingServer = async () => {
      try {
        await fetch("/api/users/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          }),
        });
      } catch (err) {
        console.error("Ping failed:", err);
      }
    };
    pingServer();
    const interval = setInterval(pingServer, 15_000);
    return () => clearInterval(interval);
  }, [userId]);

  // 👥 Fetch friends
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/friends/${userId}?tz=${new Date().getTimezoneOffset()}`);
        const data = await res.json();
        if (mounted) setFriends(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      }
    };
    fetchFriends();
    const interval = setInterval(fetchFriends, 20_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [userId]);

  // 💬 Fetch conversations (messages + calls)
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/conversations/${userId}?tz=${new Date().getTimezoneOffset()}`);
        const data = await res.json();
        if (mounted) setConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      }
    };
    fetchConversations();
    const interval = setInterval(fetchConversations, 10_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [userId]);

  // 🔍 Filter friends by search
  const visibleFriends = useMemo(
    () => friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase())),
    [friends, search]
  );

  // 🧭 Handlers
  const handleSelectFriend = (f: Friend) =>
    router.push(`/en/my-messages/conversation?receiverId=${f.id}`);

  const handleSelectConversation = (c: Conversation) =>
    router.push(`/en/my-messages/conversation?receiverId=${c.user.id}`);

  // ⏱️ Time formatter
  const formatTimeAgo = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // 📞 Call status label
  const renderCallStatus = (c: Conversation) => {
    const icon =
      c.call_type === "video" ? (
        <Video size={14} className="inline mr-1 text-blue-400" />
      ) : (
        <Phone size={14} className="inline mr-1 text-green-400" />
      );

    let statusText = "Call";
    switch (c.call_status) {
      case "missed":
        statusText = "Missed call";
        break;
      case "ended":
        statusText = "Call ended";
        break;
      case "incoming":
        statusText = "Incoming call";
        break;
      case "ongoing":
        statusText = "Ongoing call";
        break;
      case "cancelled":
        statusText = "Call cancelled";
        break;
    }
    return (
      <span className="text-sm text-blue-400 flex items-center">
        {icon} {statusText}
      </span>
    );
  };

  return (
    <main className="relative min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100">
      
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-lg z-20 px-4 py-4 border-b border-white/10 flex items-center justify-center shadow-md">
        <button
          onClick={() => router.back()}
          className="absolute left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold tracking-wide">Messages</h1>
      </div>
  
      {/* Search + Friends */}
      <div className="sticky top-16 bg-gray-900/70 backdrop-blur-md z-10 px-4 py-3 border-b border-white/10">
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 placeholder-gray-400 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
        />
  
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {visibleFriends.length === 0 ? (
            <p className="text-sm text-gray-400">No friends found</p>
          ) : (
            visibleFriends.map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelectFriend(f)}
                className="flex-shrink-0 flex flex-col items-center gap-1 w-16 relative hover:scale-105 transition-transform"
              >
                <div className="relative">
                  {f.photo ? (
                    <Image
                      src={f.photo}
                      alt={f.username}
                      width={56}
                      height={56}
                      priority
                      className="rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-lg font-semibold">
                      {f.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {f.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full shadow-md animate-pulse"></span>
                  )}
                </div>
                <span className="text-xs truncate">{f.username}</span>
              </button>
            ))
          )}
        </div>
      </div>
  
      {/* Conversations */}
      <section className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-center">No conversations yet 💬</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectConversation(c)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl text-left transition bg-white/5 hover:bg-white/10 shadow-sm hover:shadow-md border border-transparent hover:border-white/10"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {c.user.photo ? (
                  <Image
                    src={c.user.photo}
                    alt={c.user.username}
                    width={48}
                    height={48}
                    priority
                    className="rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">
                    {c.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {c.user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-900 rounded-full shadow-md animate-pulse"></span>
                )}
              </div>
  
              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold truncate text-base">{c.user.username}</h3>
                  <span className="text-[10px] text-gray-400 ml-2 whitespace-nowrap">
                    {formatTimeAgo(c.updatedAt)}
                  </span>
                </div>
  
                {c.message_type === "call" ? (
                  renderCallStatus(c)
                ) : (
                  <p
                    className={`text-[13px] truncate ${
                      c.unreadCount && c.unreadCount > 0
                        ? "text-gray-100 font-medium"
                        : "text-gray-400 font-normal"
                    }`}
                  >
                    {c.message_type === "file"
                      ? "📎 Attachment"
                      : c.lastMessage || "No message yet"}
                  </p>
                )}
  
                {c.user.isOnline ? (
                  <p className="text-[10px] text-green-400 mt-0.5">Active now</p>
                ) : c.user.last_active_local ? (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Last seen{" "}
                    {new Date(c.user.last_active_local).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
  
{/* Unread badge — hidden if count is 0 or falsy */}
{Number(c.unreadCount) > 0 && (
  <span className="ml-2 bg-blue-600 text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
    {c.unreadCount}
  </span>
)}

            </button>
          ))
        )}
      </section>
    </main>
  );
  
}
