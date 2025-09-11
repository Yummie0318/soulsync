"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import { ArrowLeft, Search, X } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface FriendUser {
  id: number;
  username: string;
  photo_file_path: string | null;
  year?: number;
  month?: number;
  day?: number;
  address?: string;
  quote?: string;
  looking_for?: string;
  age?: number | null; // optional server-provided age
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
  _followed?: boolean;
}

export default function MyFriendsPage() {
  const t = useTranslations("MyFriendsPage");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const { showNotification } = useNotification();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // search UI
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followLoadingMap, setFollowLoadingMap] = useState<
    Record<number, boolean>
  >({});

  // confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const userId =
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("user_id") || "0", 10)
      : 0;

  const searchDebounceRef = useRef<number | null>(null);

 // Get age: prefer server-provided age, otherwise compute from year only
const getAge = (ageFromServer?: number | null, year?: number | null): number | null => {
  if (typeof ageFromServer === "number" && !Number.isNaN(ageFromServer)) {
    return ageFromServer;
  }
  if (typeof year === "number" && !Number.isNaN(year)) {
    const currentYear = new Date().getFullYear();
    return currentYear - year;
  }
  return null;
};
  // load current mutual friends
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/myfriends/${userId}?locale=${locale}`);
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : Array.isArray((data as any).rows) ? (data as any).rows : []);
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

  // search debounce (username-only search). front-end displays address + looking_for
  useEffect(() => {
    // clear results when query empty
    if (!query || query.trim().length < 1) {
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
        // tolerate response shaped as rows or array or error object
        const data = await res.json();

        let rows: any[] = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray((data as any).rows)) rows = (data as any).rows;
        else {
          // unexpected shape -> treat as empty
          rows = [];
        }

        // Build set of user ids that we already follow (friends contains mutual friends only).
        const followedIds = new Set<number>(friends.map((f) => f.id));

        const mapped: SearchResultUser[] = rows.map((u: any) => {
          const followed = followedIds.has(u.id) || !!u.is_following || !!u._followed || false;
        
          return {
            id: u.id,
            username: u.username,
            photo_file_path: u.photo_file_path ?? null,
            address: u.address ?? null, // already localized from API
            city: u.city ?? null,
            postal: u.postal ?? null,
            country_id: u.country_id ?? null,
            looking_for: u.looking_for ?? null,
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
  }, [query, locale, friends, userId]);

  // unfriend
  const handleUnfriendClick = (id: number) => {
    setSelectedUserId(id);
    setConfirmOpen(true);
  };

  const handleConfirmUnfriend = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/myfriends/${selectedUserId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (data && data.success) {
        setFriends((prev) => prev.filter((f) => f.id !== selectedUserId));
        const username =
          friends.find((f) => f.id === selectedUserId)?.username || "";
        showNotification(`Unfriended ${username}`);
      } else {
        showNotification(data?.message ?? "Failed to unfriend");
      }
    } catch (err) {
      console.error("Unfriend error", err);
      showNotification("Failed to unfriend user");
    } finally {
      setConfirmOpen(false);
      setSelectedUserId(null);
    }
  };

  // follow from search
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
        showNotification(data?.message || (data?.success ? "Now following" : "Followed user"));
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
          {/* Back button (left) */}
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
  
          {/* Centered title */}
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl font-bold text-center">
            {t("title", { count: friends.length })}
          </h1>
  
          {/* Search button (right) */}
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
                    const address = u.address ?? "";
                    const followed = !!u._followed;
  
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-white/5">
                        <Image
                src={u.photo_file_path || "/images/default-avatar.png"}
                alt={u.username}
                fill
                sizes="48px" // this matches w-12 (12 * 4px = 48px)
                className="object-cover"
              />
                        </div>
  
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{u.username}</p>
                          {address && (
                            <p className="text-xs text-gray-400 truncate">
                              {address}
                            </p>
                          )}
                          {u.looking_for && (
                            <p className="text-xs text-pink-400 mt-1 break-words">
                            {t("lookingFor")}: {u.looking_for}
                          </p>
                          )}
                        </div>
  
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
  
      {/* Friends grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          // Skeletons instead of plain text
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 overflow-hidden animate-pulse"
              >
                <div className="w-full h-48 sm:h-40 bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-600 rounded w-2/3" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                  <div className="h-3 bg-gray-700 rounded w-3/4" />
                  <div className="h-8 bg-gray-600 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <p className="text-center text-gray-400">{t("noFriend")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {friends.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 overflow-hidden flex flex-col"
              >
                {/* Avatar */}
                <div
                  className="relative w-full h-48 sm:h-40 cursor-pointer group"
                  onClick={() =>
                    setPreviewImage(
                      user.photo_file_path || "/images/default-avatar.png"
                    )
                  }
                >
                  <Image
                    src={user.photo_file_path || "/images/default-avatar.png"}
                    alt={user.username}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
   {/* info */}
                <div className="p-4 flex-1 flex flex-col">
  {/* Username */}
  <p className="text-base sm:text-lg font-semibold text-white truncate">
    {user.username}
  </p>

  {/* Age */}
  {(() => {
    const age = getAge(user.age ?? null, user.year ?? null);
    return age !== null ? (
      <p className="text-xs sm:text-sm text-gray-300">
        {t("age")}: {age}
      </p>
    ) : null;
  })()}

  {/* Address */}
  {user.address && (
    <p className="text-xs sm:text-sm text-gray-400 truncate">
      {user.address}
    </p>
  )}

  {/* Looking For */}
  {user.looking_for && (
    <p className="mt-1 text-xs sm:text-sm text-pink-400 font-medium whitespace-pre-wrap break-words">
      {t("lookingFor")}: {user.looking_for}
    </p>
  )}

  {/* Quote */}
  {user.quote && (
    <p className="mt-1 text-xs italic text-gray-300 whitespace-pre-wrap break-words">
      “{user.quote}”
    </p>
  )}

  {/* Unfriend button */}
  <div className="mt-4 flex gap-2">
    <button
      onClick={() => handleUnfriendClick(user.id)}
      className="flex-1 px-3 py-2 rounded-xl text-white text-xs sm:text-sm font-medium shadow-md transition bg-red-600 hover:bg-red-700"
    >
      {t("unfriend")}
    </button>
  </div>
</div>

              </motion.div>
            ))}
          </div>
        )}
      </div>
  
      {/* Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-full max-w-md h-[70vh]"
            >
              <Image
                src={previewImage}
                alt="Preview"
                fill
                className="object-contain rounded-xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  
      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("unfriendDialogTitle")}
        message={t("unfriendDialogMessage")}
        confirmText={t("unfriend")}
        cancelText={t("cancel")}
        onConfirm={handleConfirmUnfriend}
        onCancel={() => setConfirmOpen(false)}
      />

    </main>
  );
  
}
