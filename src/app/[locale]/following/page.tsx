"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import { ArrowLeft } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog"; // ✅ import dialog

interface FollowingUser {
  id: number;
  username: string;
  photo_file_path: string | null;
  year?: number;
  month?: number;
  day?: number;
  address?: string;
  quote?: string;
  looking_for?: string;
  isFollowingBack?: boolean;
}

export default function FollowingPage() {
  const t = useTranslations("FollowingPage");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const { showNotification } = useNotification();
  const router = useRouter();

  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ✅ confirm dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

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

    const fetchFollowing = async () => {
      try {
        const res = await fetch(`/api/following/${userId}?locale=${locale}`);
        const data = await res.json();
        if (Array.isArray(data)) setFollowing(data);
        else setFollowing([]);
      } catch (err) {
        showNotification("Failed to load following list");
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId, locale]);

  // ✅ open confirm dialog
  const handleUnfollowClick = (id: number) => {
    setSelectedUserId(id);
    setConfirmOpen(true);
  };

  // ✅ confirm unfollow
  const handleConfirmUnfollow = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/following/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: userId,
          following_id: selectedUserId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setFollowing((prev) => prev.filter((f) => f.id !== selectedUserId));
        const username =
          following.find((f) => f.id === selectedUserId)?.username || "";
        showNotification(`Unfollowed ${username}`);
      }
    } catch {
      showNotification("Failed to unfollow user");
    } finally {
      setConfirmOpen(false);
      setSelectedUserId(null);
    }
  };

  const filteredFollowing = following.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center justify-center">
        <button
          onClick={() => router.back()}
          className="absolute left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-center">
          {t("title", { count: following.length })}
        </h1>
      </div>

      {/* Search Bar */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <input
          type="text"
          placeholder="Search following..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl bg-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Following grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-400">Loading following...</p>
        ) : filteredFollowing.length === 0 ? (
          <p className="text-center text-gray-400">No following found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFollowing.map((user) => (
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

                {/* Profile Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-base sm:text-lg font-semibold text-white truncate">
                    {user.username}{" "}
                    {user.year && (
                      <span className="text-gray-300 text-sm">
                        · {getAge(user.year, user.month, user.day)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {user.address}
                  </p>

                  {user.looking_for && (
                    <p className="mt-1 text-xs sm:text-sm text-pink-400 font-medium whitespace-pre-wrap break-words">
                      Looking for: {user.looking_for}
                    </p>
                  )}

                  {user.quote && (
                    <p className="mt-1 text-xs italic text-gray-300 whitespace-pre-wrap break-words">
                      “{user.quote}”
                    </p>
                  )}

                  {/* Unfollow button */}
                  <div className="mt-4 flex">
                    <button
                      onClick={() => handleUnfollowClick(user.id)}
                      className="flex-1 px-3 py-2 rounded-xl text-white text-xs sm:text-sm font-medium shadow-md transition bg-red-600 hover:bg-red-700"
                    >
                      Unfollow
                    </button>
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
        title="Unfollow User"
        message="Are you sure you want to unfollow this user?"
        confirmText="Unfollow"
        cancelText="Cancel"
        onConfirm={handleConfirmUnfollow}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
