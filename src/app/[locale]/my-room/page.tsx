"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  User,
  Home,
  MapPin,
  Calendar,
  Users,
  LogOut,
  Heart,
  UserPlus,
  Settings,
  Search,
  Edit,
  ArrowLeft,
  Compass,
  MessageCircle,
  Sparkles,
  House,
  Send,
  ImagePlus,
} from "lucide-react";

export default function MyRoomPage() {
  // ✅ Unified posts state
  const [posts, setPosts] = useState<
    { text: string; comments: string[]; showComments?: boolean; showAll?: boolean }[]
  >([
    {
      text: "Sample post!",
      comments: ["Comment 1!", "Comment 2", "Comment 3", "🔥🔥🔥", "Comment 4!", "Comment 5!"],
      showComments: false,
      showAll: false,
    },
  ]);

  const [newPost, setNewPost] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null); // ✅ added this

  const handlePost = () => {
    if (newPost.trim() === "") return;
    setPosts([
      {
        text: newPost,
        comments: [],
        showComments: false,
        showAll: false,
      },
      ...posts,
    ]);
    setNewPost("");
    setPreviewImage(null); // ✅ clear preview after posting
  };
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 pb-24">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Back Button */}
      <button className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition">
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Profile Section */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-6">
       {/* Profile Card */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3, duration: 0.6 }}
  className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-6"
>
  {/* Edit Button - Top Right */}
  <button className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs sm:text-sm text-pink-400 transition">
    <Edit className="w-4 h-4" /> Edit Profile
  </button>

  {/* Left: Avatar */}
  <div className="flex-shrink-0 flex flex-col items-center sm:items-start">
    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
      <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
        <Image
          src="/images/default-avatar.png"
          alt="Profile Avatar"
          width={160}
          height={160}
          className="rounded-full object-cover"
        />
      </div>
    </div>
  </div>

  {/* Right: Info */}
  <div className="flex-1 space-y-4 w-full">
    {/* Username */}
    <h2 className="text-xl sm:text-2xl font-bold">Juan Dela Cruz</h2>

    {/* Stats */}
    <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-gray-400">
      <span>{posts.length} posts</span>
      <span>0 followers</span>
      <span>0 following</span>
    </div>

    {/* Details */}
    <div className="space-y-1 text-sm text-gray-300">
      <p className="flex items-center gap-2">
        <User className="w-4 h-4 text-pink-400" /> 1692 years old (Born
        333/33/333)
      </p>
      <p className="flex items-center gap-2">
        <Home className="w-4 h-4 text-pink-400" /> Home: 33, Algeria (333)
      </p>
      <p className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-pink-400" /> Current: Same as home
      </p>
    </div>

    {/* Actions */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
      <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs sm:text-sm font-medium transition">
        <Search className="w-4 h-4" /> Find Matches
      </button>
      <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs sm:text-sm font-medium transition">
        <Settings className="w-4 h-4" /> Settings
      </button>
      <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/20 border border-white/10 text-red-400 text-xs sm:text-sm font-medium transition col-span-2 sm:col-span-1">
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  </div>
</motion.div>



{/* Social Stats */}
<div className="grid grid-cols-3 gap-3">
  <button className="bg-gray-800/40 backdrop-blur-md rounded-xl py-5 border border-white/10 text-center hover:bg-gray-800/60 transition shadow-md">
    <Users className="w-6 h-6 mx-auto text-pink-400" />
    <p className="text-sm font-semibold mt-1">Followers</p>
    <span className="text-xs text-gray-400">0</span>
  </button>
  <button className="bg-gray-800/40 backdrop-blur-md rounded-xl py-5 border border-white/10 text-center hover:bg-gray-800/60 transition shadow-md">
    <UserPlus className="w-6 h-6 mx-auto text-pink-400" />
    <p className="text-sm font-semibold mt-1">Following</p>
    <span className="text-xs text-gray-400">0</span>
  </button>
  <button className="bg-gray-800/40 backdrop-blur-md rounded-xl py-5 border border-white/10 text-center hover:bg-gray-800/60 transition shadow-md">
    <Heart className="w-6 h-6 mx-auto text-pink-400" />
    <p className="text-sm font-semibold mt-1">My Friends</p>
    <span className="text-xs text-gray-400">0</span>
  </button>
</div>

{/* Date Plans */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1, duration: 0.6 }}
  className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10"
>
  <h3 className="text-lg font-semibold flex items-center gap-2">
    <Calendar className="w-5 h-5 text-pink-400" /> Date Plans
  </h3>
  <div className="flex flex-col items-center text-center py-6">
    <Calendar className="w-10 h-10 text-pink-400 mb-2" />
    <p className="text-sm text-gray-400">No active conversations yet</p>
    <p className="text-sm text-pink-400">Start matching to plan dates!</p>
  </div>
</motion.div>

{/* Your Date Plans */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2, duration: 0.6 }}
  className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10"
>
  <h3 className="text-lg font-semibold">Your Date Plans</h3>
  <p className="text-sm text-gray-400 mt-1">
    You haven’t created any date plans yet.
  </p>
</motion.div>



{/* Posting Section */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3, duration: 0.6 }}
  className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 space-y-4"
>
  <h3 className="text-lg font-semibold">Create a Post</h3>

  {/* Input + Attach */}
  <div className="flex items-center gap-3">
    <input
      type="text"
      value={newPost}
      onChange={(e) => setNewPost(e.target.value)}
      placeholder="What's on your mind?"
      className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-white/20 text-sm focus:outline-none focus:border-pink-400"
    />

    {/* Hidden file input */}
    <input
      type="file"
      accept="image/*"
      id="fileInput"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewImage(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }}
    />

    {/* Upload Button */}
    <label
      htmlFor="fileInput"
      className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-white/20 text-gray-300 cursor-pointer transition flex items-center justify-center"
    >
      <ImagePlus className="w-5 h-5 text-pink-400" />
    </label>

    {/* Post Button */}
    <button
      onClick={handlePost}
      className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white flex items-center gap-2 transition"
    >
      <Send className="w-4 h-4" />
      Post
    </button>
  </div>

  {/* Image Preview */}
  {previewImage && (
    <div className="relative mt-2">
      <Image
        src={previewImage}
        alt="Preview"
        width={400}
        height={300}
        className="rounded-lg max-h-48 object-cover w-auto"
      />
      <button
        onClick={() => setPreviewImage(null)}
        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1"
      >
        ✖
      </button>
    </div>
  )}
</motion.div>


{/* Posts Feed */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.4, duration: 0.6 }}
  className="mt-6 space-y-4"
>
  {posts.length === 0 && (
    <p className="text-sm text-gray-400 text-center">No posts yet.</p>
  )}

  {posts.map((post, index) => (
    <div
      key={index}
      className="bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden"
    >
    {/* Post Content */}
<div className="p-4">
  <p className="text-sm mb-3">{post.text}</p>
  <div className="w-full max-h-60 overflow-hidden rounded-lg">
    <Image
      src="/images/sample-post.jpg"
      alt="Sample Post"
      width={600}
      height={400}
      className="w-full h-60 object-cover rounded-lg shadow-md"
    />
  </div>
</div>


      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
        <button className="flex items-center gap-1 text-gray-400 hover:text-pink-400 transition">
          <Heart className="w-5 h-5" /> <span className="text-sm">Like</span>
        </button>
        <button
          onClick={() =>
            setPosts(
              posts.map((p, i) =>
                i === index ? { ...p, showComments: !p.showComments } : p
              )
            )
          }
          className="flex items-center gap-1 text-gray-400 hover:text-pink-400 transition"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comments</span>
        </button>
      </div>

      {/* Comments Section */}
      <div className="px-4 py-3 border-t border-white/10 space-y-3">
        {/* Show comments only when toggled */}
        {post.showComments && (
          <>
            {post.comments
              ?.slice(0, post.showAll ? post.comments.length : 5)
              .map((c, i) => (
                <p key={i} className="text-sm text-gray-300">
                  <span className="font-semibold text-pink-400">
                    User{i + 1}:
                  </span>{" "}
                  {c}
                </p>
              ))}

            {/* Show More / Less */}
            {post.comments?.length > 5 && (
              <button
                onClick={() =>
                  setPosts(
                    posts.map((p, i) =>
                      i === index ? { ...p, showAll: !p.showAll } : p
                    )
                  )
                }
                className="text-xs text-pink-400 hover:underline"
              >
                {post.showAll ? "Show less" : "Show more"}
              </button>
            )}
          </>
        )}

        {/* Add Comment with Send Button (always visible) */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Write a comment..."
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-white/20 text-sm focus:outline-none focus:border-pink-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
                const newComment = e.currentTarget.value;
                setPosts(
                  posts.map((p, i) =>
                    i === index
                      ? {
                          ...p,
                          comments: [...(p.comments || []), newComment],
                        }
                      : p
                  )
                );
                e.currentTarget.value = "";
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget
                .previousSibling as HTMLInputElement;
              if (input.value.trim() !== "") {
                const newComment = input.value;
                setPosts(
                  posts.map((p, i) =>
                    i === index
                      ? {
                          ...p,
                          comments: [...(p.comments || []), newComment],
                        }
                      : p
                  )
                );
                input.value = "";
              }
            }}
            className="p-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  ))}
</motion.div>



        
      </section>

      {/* Bottom / Expanded Navigation */}
      <nav
        className="
  fixed bottom-2 left-1/2 -translate-x-1/2 
  w-[95%] max-w-lg md:max-w-4xl lg:max-w-6xl 
  rounded-2xl 
  bg-gradient-to-r from-pink-600/90 to-purple-600/90 
  backdrop-blur-md border border-white/20 
  flex justify-around items-center 
  py-3 md:py-4 lg:py-5 
  text-sm lg:text-base text-white 
  shadow-lg
"
      >
        <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
          <Compass className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="text-xs lg:text-sm">Search</span>
        </button>
        <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
          <Users className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="text-xs lg:text-sm">Islands</span>
        </button>
        <button className="flex flex-col lg:flex-row items-center gap-1 text-pink-300">
          <House className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="text-xs lg:text-sm">My Room</span>
        </button>
        <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
          <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="text-xs lg:text-sm">Journey</span>
        </button>
        <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
          <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="text-xs lg:text-sm">Messages</span>
        </button>
      </nav>
    </main>
  );
}
