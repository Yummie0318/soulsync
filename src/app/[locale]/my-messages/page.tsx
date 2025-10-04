"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import { ArrowLeft } from "lucide-react";

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
  updatedAt: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const { showNotification } = useNotification();

  const [userId, setUserId] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (stored) setUserId(Number(stored));
  }, []);

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
    const interval = setInterval(pingServer, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Fetch friends
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/friends/${userId}?locale=en&tz=${new Date().getTimezoneOffset()}`);
        const data = await res.json();
        if (!mounted) return;
        setFriends(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      }
    };

    fetchFriends();
    const interval = setInterval(fetchFriends, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [userId]);

  // Fetch conversations
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/conversations/${userId}?tz=${new Date().getTimezoneOffset()}`);
        const data = await res.json();
        if (!mounted) return;
        setConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [userId]);

  const visibleFriends = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectFriend = (f: Friend) =>
    router.push(`/en/my-messages/conversation?receiverId=${f.id}`);

  const handleSelectConversation = (c: Conversation) =>
    router.push(`/en/my-messages/conversation?receiverId=${c.user.id}`);

  const avatarSize = 56;
  const convAvatarSize = 44;

  return (
    <main className="relative min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200">
      
      {/* Header with Back and Title */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center justify-center">
        {/* Back button (left-aligned) */}
        <button
          onClick={() => router.back()}
          className="absolute left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
  
        {/* Centered Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-center">
          Messages
        </h1>
      </div>
  
      {/* Top Bar: Search + Friends scroll */}
      <div className="sticky top-16 bg-gray-900/80 z-10 px-4 py-3 border-b border-white/10">
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 placeholder-gray-400 text-sm mb-3"
        />
  
        {/* Friends scroll */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {visibleFriends.length === 0 ? (
            <p className="text-sm text-gray-400">No friends found</p>
          ) : (
            visibleFriends.map(f => (
              <button
                key={f.id}
                onClick={() => handleSelectFriend(f)}
                className="flex-shrink-0 flex flex-col items-center gap-1 w-16 relative"
              >
                <div className="relative">
                  {f.photo ? (
                    <Image
                      src={f.photo}
                      alt={f.username}
                      width={avatarSize}
                      height={avatarSize}
                      priority
                      style={{ width: `${avatarSize}px`, height: `${avatarSize}px`, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-lg font-semibold">
                      {f.username.charAt(0).toUpperCase()}
                    </div>
                  )}
  
                  {/* Green dot if online */}
                  {f.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-gray-900 animate-pulse"></span>
                  )}
                </div>
  
                <span className="text-xs truncate">{f.username}</span>
              </button>
            ))
          )}
        </div>
      </div>
  
{/* Conversations */}
<section className="flex-1 overflow-y-auto px-4 py-4">
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-center">No conversations yet 💬</p>
        ) : (
          conversations.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectConversation(c)}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition hover:bg-white/5 mb-2 relative"
            >
              <div className="relative">
                {c.user.photo ? (
                  <Image
                    src={c.user.photo}
                    alt={c.user.username}
                    width={convAvatarSize}
                    height={convAvatarSize}
                    priority
                    style={{ width: `${convAvatarSize}px`, height: `${convAvatarSize}px`, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">
                    {c.user.username.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Green dot if online */}
                {c.user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-gray-900 animate-pulse"></span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-medium">{c.user.username}</span>
                <p className="text-xs text-gray-400 truncate">{c.lastMessage}</p>
                {c.user.isOnline ? (
                  <p className="text-[10px] text-green-500 mt-0.5">Active now</p>
                ) : c.user.last_active_local ? (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Last login: {new Date(c.user.last_active_local).toLocaleString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                ) : null}
              </div>
            </button>

          ))
        )}
      </section>
      
    </main>
  );
}
