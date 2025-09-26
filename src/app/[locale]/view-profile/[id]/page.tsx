"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, User, Home, MapPin, Heart, Pencil } from "lucide-react";
import BottomNav from "@/components/BottomNav";

function getAge(year?: number, month?: number, day?: number) {
  if (!year) return null;
  const today = new Date();
  const birthDate = new Date(year, (month ?? 1) - 1, day ?? 1);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function ViewProfile() {
  const { id } = useParams();
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // ✅ Get logged-in user from localStorage
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) setCurrentUserId(Number(storedId));
  }, []);

  // -------------------- Fetch User --------------------
  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${id}`);
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // -------------------- Fetch Posts --------------------
  useEffect(() => {
    if (!id || !currentUserId) return;
    const fetchPosts = async () => {
      try {
        const res = await fetch(
          `/api/posts?user_id=${id}&current_user_id=${currentUserId}`
        );
        const data = await res.json();
        setPosts(
          data.map((p: any) => ({
            ...p,
            image: p.image_path ?? null,
            isLikedByCurrentUser: p.isLikedByCurrentUser ?? false,
          }))
        );
      } catch (err) {
        console.error("Failed to load posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [id, currentUserId]);

  // -------------------- Toggle Like --------------------
  const handleToggleLike = async (postId: number, isLiked: boolean) => {
    if (!currentUserId) return;

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUserId }),
      });

      const data = await res.json();

      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1,
                  isLikedByCurrentUser: !isLiked,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const openEditModal = (post: any) => {
    console.log("Edit post clicked:", post);
    // TODO: implement modal
  };


  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 pb-24 px-2 sm:px-4">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-60 sm:w-72 h-60 sm:h-72 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-60 sm:w-72 h-60 sm:h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-300" />
      </div>
  
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center justify-center">
        <button
          onClick={() => router.back()}
          className="absolute left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-center">View Profile</h1>
      </div>
  
      {/* Profile Section */}
      <section className="max-w-4xl mx-auto py-8 space-y-6">
        {loading ? (
          // Skeleton Loader
          <motion.div className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg flex flex-col items-center sm:flex-row sm:items-start gap-6 w-full max-w-4xl mx-auto animate-pulse">
            <div className="w-32 sm:w-40 aspect-square rounded-full bg-gray-700" />
            <div className="flex-1 min-w-0 space-y-4 w-full text-center sm:text-left">
              <div className="h-6 w-1/3 bg-gray-700 rounded mx-auto sm:mx-0" />
              <div className="h-4 w-2/3 bg-gray-700 rounded mx-auto sm:mx-0" />
            </div>
          </motion.div>
        ) : user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg flex flex-col items-center sm:flex-row sm:items-start gap-6 w-full max-w-4xl mx-auto"
          >
            {/* Avatar */}
            <div
              onClick={() =>
                setPreviewImage(user.photo_file_path || "/images/default-avatar.jpg")
              }
              className="cursor-pointer w-32 sm:w-40 aspect-square rounded-full p-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
            >
              <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden relative">
                <Image
                  src={user.photo_file_path || "/images/default-avatar.jpg"}
                  alt="Profile Avatar"
                  fill
                  priority
                  sizes="128px"
                  className="object-cover rounded-full"
                />
              </div>
            </div>
  
            {/* Info + Actions */}
            <div className="flex-1 min-w-0 space-y-4 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-2xl font-bold break-words">{user.username}</h2>
  
                {/* ✅ Message Button */}
                <button
                  onClick={() => router.push(`/messages/${user.id}`)}
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-medium shadow-md transition w-full sm:w-auto"
                >
                  Message
                </button>
              </div>
  
              {user.quote && (
                <p className="text-gray-400 italic text-sm mt-1 break-words whitespace-pre-line">
                  “{user.quote}”
                </p>
              )}
  
              {/* Stats */}
              <div className="flex justify-center sm:justify-start gap-6 mt-2 text-center">
                <div>
                  <div className="font-bold text-lg">{user.posts_count ?? 0}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">Posts</div>
                </div>
                <div>
                  <div className="font-bold text-lg">{user.following_count ?? 0}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">Following</div>
                </div>
                <div>
                  <div className="font-bold text-lg">{user.followers_count ?? 0}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">Followers</div>
                </div>
              </div>
  
              {/* User Info */}
              <div className="space-y-1 text-sm text-gray-300 mt-2 text-center sm:text-left">
                {user.year && (
                  <p className="flex items-center gap-2 justify-center sm:justify-start">
                    <User className="w-4 h-4 text-pink-400" />
                    {getAge(user.year, user.month, user.day)} years old
                  </p>
                )}
                {user.city && (
                  <p className="flex items-center gap-2 justify-center sm:justify-start">
                    <Home className="w-4 h-4 text-pink-400" />
                    Home: {user.city}, {user.country_name}
                  </p>
                )}
                {user.current_country_name && (
                  <p className="flex items-center gap-2 justify-center sm:justify-start">
                    <MapPin className="w-4 h-4 text-pink-400" />
                    Current: {user.current_country_name}
                  </p>
                )}
                {user.looking_for && (
                  <p className="flex items-center gap-2 justify-center sm:justify-start text-pink-300 font-medium">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Looking for: {user.looking_for}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <p className="text-center text-gray-400">User not found</p>
        )}
      </section>
  
      {/* -------------------- User Posts -------------------- */}
      <section className="max-w-4xl mx-auto py-8 space-y-6">
        <h3 className="text-lg font-semibold mb-2">Posts</h3>
  
        {posts.length === 0 && !loadingPosts ? (
          <div className="text-gray-400 text-center py-10">No posts available</div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-md w-full"
            >
              {/* Post Text */}
              <p className="text-sm text-white whitespace-pre-line">{post.text}</p>
  
              {/* Post Image */}
              {post.image_path && (
                <div
                  className="mt-2 w-full h-40 relative rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setPreviewImage(post.image_path ?? null)}
                >
                  <Image
                    src={post.image_path}
                    alt="Post Image"
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}
  
              {/* Likes & Actions */}
              <div className="flex items-center justify-between mt-2 text-gray-300 text-sm gap-2">
                <button
                  onClick={() =>
                    handleToggleLike(post.id, post.isLikedByCurrentUser ?? false)
                  }
                  className="flex items-center gap-1"
                >
                  {post.isLikedByCurrentUser ? (
                    <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                  ) : (
                    <Heart className="w-5 h-5 text-pink-500" />
                  )}
                  <span>
                    {post.likes_count} {post.likes_count === 1 ? "Like" : "Likes"}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
  
        {/* Skeleton while loading posts */}
        {loadingPosts &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`loading-${i}`}
              className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-md w-full animate-pulse"
            >
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-40 bg-gray-700 rounded mb-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
                <div className="h-4 bg-gray-700 rounded w-12"></div>
              </div>
            </div>
          ))}
      </section>
  
      {/* -------------------- Unified Preview Modal -------------------- */}
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
              className="relative w-full max-w-2xl h-[70vh]"
              onClick={(e) => e.stopPropagation()} // ✅ prevent closing when clicking inside
            >
              <Image
                src={previewImage}
                alt="Preview"
                fill
                className="object-contain rounded-xl"
              />
  
              {/* Close Button */}
              <div
                className="absolute top-4 right-4 text-white cursor-pointer text-2xl font-bold"
                onClick={() => setPreviewImage(null)}
              >
                ✖
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav />
    </main>


  );
  
}
