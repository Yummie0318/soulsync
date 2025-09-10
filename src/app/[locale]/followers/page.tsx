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
  year?: number;
  month?: number;
  day?: number;
  address?: string;
  quote?: string;
  looking_for?: string;
  isFollowing?: boolean;
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

  const getAge = (year?: number, month?: number, day?: number) => {
    if (!year || !month || !day) return null;
    const birthDate = new Date(year, month - 1, day);
    const diff = Date.now() - birthDate.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
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
        const username =
          followers.find((f) => f.id === followerId)?.username || "";
        showNotification(
          data.following
            ? `You are now following ${username}`
            : `Unfollowed ${username}`
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
          placeholder="Search followers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl bg-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Followers grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-400">Loading followers...</p>
        ) : filteredFollowers.length === 0 ? (
          <p className="text-center text-gray-400">No followers found.</p>
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
                  <p className="text-base sm:text-lg font-semibold text-white truncate">
                    {follower.username}{" "}
                    {follower.year && (
                      <span className="text-gray-300 text-sm">
                        · {getAge(follower.year, follower.month, follower.day)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {follower.address}
                  </p>

                  {/* Looking for wraps fully now */}
                  {follower.looking_for && (
                    <p className="mt-1 text-xs sm:text-sm text-pink-400 font-medium whitespace-pre-wrap break-words">
                      Looking for: {follower.looking_for}
                    </p>
                  )}

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
                      {follower.isFollowing ? "Following" : "Follow Back"}
                    </button>

                    {!follower.isFollowing && (
                      <button
                        onClick={() => handleRemoveClick(follower.id)}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium shadow-md transition"
                      >
                        Remove
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
        title="Remove Follower"
        message="Are you sure you want to remove this follower?"
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
