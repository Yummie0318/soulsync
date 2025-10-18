"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotification } from "@/context/NotificationContext";
import { useTranslations } from "next-intl";

interface FriendUser {
  id: number;
  username: string;
  photo_file_path?: string | null;
  address?: string | null;
  looking_for?: string | null;
}

interface SearchResultUser {
  id: number;
  username: string;
  photo_file_path?: string | null;
  address?: string | null;
  city?: string | null;
  postal?: string | null;
  country_id?: number | null;
  looking_for?: string | null;
  is_following?: boolean; // ✅ comes from API
  _followed?: boolean; // ✅ normalized for frontend
}

export default function MyFriendsPage() {
  const t = useTranslations("MyFriendsPage");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const { showNotification } = useNotification();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);

  // search UI
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followLoadingMap, setFollowLoadingMap] = useState<
    Record<number, boolean>
  >({});

  const userId =
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("user_id") || "0", 10)
      : 0;

  const searchDebounceRef = useRef<number | null>(null);

  // Load current friends (mutuals)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/myfriends/${userId}?locale=${locale}`);
        const data = await res.json();
        setFriends(
          Array.isArray(data)
            ? data
            : Array.isArray((data as any).rows)
            ? (data as any).rows
            : []
        );
      } catch (err) {
        console.error("Fetch friends error", err);
        showNotification("Failed to load friends list");
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [userId, locale, showNotification]);

  // 🔍 Search debounce
  useEffect(() => {
    if (!query.trim()) {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const url = `/api/users/search?q=${encodeURIComponent(
          query
        )}&locale=${locale}&userId=${userId}`;

        const res = await fetch(url);
        const data = await res.json();

        let rows: any[] = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray((data as any).rows)) rows = (data as any).rows;

        const mapped: SearchResultUser[] = rows.map((u: any) => {
          const followed =
            !!u.is_following || !!u._followed || false;

          return {
            id: u.id,
            username: u.username,
            photo_file_path: u.photo_file_path ?? null,
            address: u.address ?? null,
            city: u.city ?? null,
            postal: u.postal ?? null,
            country_id: u.country_id ?? null,
            looking_for: u.looking_for ?? null,
            is_following: u.is_following ?? false,
            _followed: followed,
          };
        });

        setSearchResults(mapped);
      } catch (err) {
        console.error("Search error", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [query, locale, userId]);

  // ➕ Follow from search
  const handleFollow = async (friendId: number) => {
    if (!userId) {
      showNotification("Not logged in");
      return;
    }

    setFollowLoadingMap((m) => ({ ...m, [friendId]: true }));

    try {
      const res = await fetch(`/api/myfriends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, friendId }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        console.error("Follow failed", data);
        showNotification(data?.message ?? "Failed to follow");
      } else {
        setSearchResults((prev) =>
          prev.map((u) => (u.id === friendId ? { ...u, _followed: true } : u))
        );
        showNotification(
          data?.message || (data?.success ? "Now following" : "Followed user")
        );
      }
    } catch (err) {
      console.error("Follow exception", err);
      showNotification("Failed to follow user");
    } finally {
      setFollowLoadingMap((m) => ({ ...m, [friendId]: false }));
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 pb-12">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between relative">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Centered title */}
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl font-bold text-center">
            {t("Search", { count: friends.length })}
          </h1>

          {/* Search button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen((s) => !s)}
              aria-label={searchOpen ? "Close search" : "Open search"}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
          </div>
        </div>

        {/* Expandable search panel */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-6xl mx-auto mt-4 px-2"
            >
              <div className="bg-white/6 p-3 rounded-xl">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full px-4 py-2 rounded-xl bg-transparent border border-white/10 text-gray-100 placeholder-gray-400 focus:outline-none"
                />

                <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                  {searchLoading && (
                    <p className="text-sm text-gray-400">{t("searching")}</p>
                  )}

                  {!searchLoading &&
                    query.trim().length > 0 &&
                    searchResults.length === 0 && (
                      <p className="text-sm text-gray-400">{t("noFriends")}</p>
                    )}

                  {searchResults.map((u) => {
                    const followed = !!u._followed;

                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition"
                      >
                        {/* Avatar */}
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-white/5">
                          <Image
                            src={
                              u.photo_file_path || "/images/default-avatar.png"
                            }
                            alt={u.username}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{u.username}</p>
                          {u.address && (
                            <p className="text-xs text-gray-400 truncate">
                              {u.address}
                            </p>
                          )}
                          {u.looking_for && (
                            <p className="text-xs text-pink-400 mt-1 break-words">
                              {t("lookingFor")}: {u.looking_for}
                            </p>
                          )}
                        </div>

                        {/* Follow button */}
                        <div>
                          <button
                            onClick={() =>
                              followed ? undefined : handleFollow(u.id)
                            }
                            disabled={followLoadingMap[u.id] || followed}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                              followed
                                ? "bg-gray-600 text-white cursor-default"
                                : "bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700"
                            }`}
                          >
                            {followLoadingMap[u.id]
                              ? "..."
                              : followed
                              ? "Following"
                              : "Follow"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
