"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import { ArrowLeft } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog"; // ✅ import dialog

interface Follower {
  id: number;
  username: string;
  photo_file_path: string | null;
  year?: number | null;
  month?: number;
  day?: number;
  address?: string;
  quote?: string;
  looking_for?: string;
  isFollowing?: boolean;
  age?: number | null; // <-- new optional field (server may provide this)
}

export default function FollowersPage() {
  const t = useTranslations("FollowersPage");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const { showNotification } = useNotification();
  const router = useRouter();

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // For confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState<number | null>(null);

  const userId =
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("user_id") || "0", 10)
      : 0;

// prefer server-provided age, otherwise compute from year only
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


  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFollowers = async () => {
      try {
        const res = await fetch(`/api/followers/${userId}?locale=${locale}`);
        const data = await res.json();
        if (Array.isArray(data)) setFollowers(data);
        else setFollowers([]);
      } catch (err) {
        showNotification("Failed to load followers");
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [userId, locale]);

  // Open confirm dialog
  const handleRemoveClick = (followerId: number) => {
    setSelectedFollower(followerId);
    setConfirmOpen(true);
  };

  // Confirm remove
  const handleConfirmRemove = async () => {
    if (!selectedFollower) return;

    try {
      const res = await fetch(`/api/followers/${selectedFollower}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: selectedFollower,
          following_id: userId,
        }),
      });

      if (res.ok) {
        setFollowers((prev) =>
          prev.filter((f) => f.id !== selectedFollower)
        );
        showNotification("Follower removed");
      }
    } catch {
      showNotification("Error removing follower");
    } finally {
      setConfirmOpen(false);
      setSelectedFollower(null);
    }
  };

  const handleToggleFollow = async (followerId: number) => {
    try {
      const res = await fetch(`/api/followers/${followerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: userId, following_id: followerId }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowers((prev) =>
          prev.map((f) =>
            f.id === followerId ? { ...f, isFollowing: data.following } : f
          )
        );
        const username = followers.find((f) => f.id === followerId)?.username || "";
        showNotification(
          data.following
            ? t("followNotification", { username })
            : t("unfollowNotification", { username })
        );
      }
    } catch {
      showNotification("Failed to toggle follow");
    }
  };

  const filteredFollowers = followers.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center justify-between">
        {/* Back icon */}
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
  
        {/* Centered title */}
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl font-bold text-center">
          {t("title", { count: followers.length })}
        </h1>
      </div>
  
      {/* Search Bar */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl bg-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>
  
      {/* Followers grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          // Skeleton Loader
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 overflow-hidden flex flex-col animate-pulse"
              >
                {/* Skeleton Avatar */}
                <div className="w-full h-48 sm:h-40 bg-gray-700" />
  
                {/* Skeleton Content */}
                <div className="p-4 flex-1 flex flex-col space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-700 rounded w-full"></div>
                  <div className="mt-auto flex gap-2">
                    <div className="h-8 bg-gray-700 rounded-xl flex-1"></div>
                    <div className="h-8 bg-gray-700 rounded-xl w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFollowers.length === 0 ? (
          <p className="text-center text-gray-400">
          {t("FollowersPage.noFollowers")}
        </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFollowers.map((follower) => (
              <motion.div
                key={follower.id}
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
                      follower.photo_file_path || "/images/default-avatar.png"
                    )
                  }
                >
                  <Image
                    src={follower.photo_file_path || "/images/default-avatar.png"}
                    alt={follower.username}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
  
               {/* Profile Info */}
<div className="p-4 flex-1 flex flex-col">
  {/* Username */}
  <p className="text-base sm:text-lg font-semibold text-white truncate">
    {follower.username}
  </p>

  {/* Age */}
  {(() => {
    const age = getAge(follower.age ?? null, follower.year ?? null);
    return age !== null ? (
      <p className="text-xs sm:text-sm text-gray-300">
        {t("age")}: {age}
      </p>
    ) : null;
  })()}

  {/* Address */}
  {follower.address && (
    <p className="text-xs sm:text-sm text-gray-400 truncate">
      {follower.address}
    </p>
  )}

  {/* Looking For */}
  {follower.looking_for && (
    <p className="mt-1 text-xs sm:text-sm text-pink-400 font-medium whitespace-pre-wrap break-words">
      {t("lookingFor")}: {follower.looking_for}
    </p>
  )}

  {/* Quote */}
  {follower.quote && (
    <p className="mt-1 text-xs italic text-gray-300 whitespace-pre-wrap break-words">
      “{follower.quote}”
    </p>
  )}

  {/* Buttons */}
  <div className="mt-4 flex gap-2">
    <button
      onClick={() => handleToggleFollow(follower.id)}
      className={`flex-1 px-3 py-2 rounded-xl text-white text-xs sm:text-sm font-medium shadow-md transition ${
        follower.isFollowing
          ? "bg-gray-600 hover:bg-gray-700"
          : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
      }`}
    >
      {follower.isFollowing ? t("following") : t("followBack")}
    </button>

    {!follower.isFollowing && (
      <button 
        onClick={() => handleRemoveClick(follower.id)}
        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium shadow-md transition"
      >
        {t("remove")}
      </button>
    )}
  </div>
</div>



              </motion.div>
            ))}
          </div>
        )}
      </div>
  
      {/* Image Preview */}
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
  
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("removeTitle")}
        message={t("removeMessage")}
        confirmText={t("remove")}
        cancelText={t("cancel")}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmOpen(false)}
      />

    </main>
  );
  
}
