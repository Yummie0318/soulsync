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
  // ✅ Unified posts state with optional image
  const [posts, setPosts] = useState<
    {
      text: string;
      comments: string[];
      showComments?: boolean;
      showAll?: boolean;
      image?: string;
    }[]
  >([
    {
      text: "Sample post! Welcome to your dating app.",
      comments: ["Nice!", "😍 Love this!", "🔥🔥🔥", "Awesome!"],
      showComments: false,
      showAll: false,
      image: "/images/sample-post.jpg",
    },
  ]);

  const [newPost, setNewPost] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handlePost = () => {
    if (newPost.trim() === "") return;
    setPosts([
      {
        text: newPost,
        comments: [],
        showComments: false,
        showAll: false,
        image: previewImage || undefined,
      },
      ...posts,
    ]);
    setNewPost("");
    setPreviewImage(null);
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 pb-24 px-2 sm:px-4">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-60 sm:w-72 h-60 sm:h-72 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-60 sm:w-72 h-60 sm:h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Back Button */}
      <button className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition">
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Profile Section */}
      <section className="max-w-4xl mx-auto py-16 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full"
        >
          {/* Edit Button */}
          <button className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs sm:text-sm text-pink-400 transition">
            <Edit className="w-4 h-4" /> Edit Profile
          </button>

          {/* Left: Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center sm:items-start">
            <div className="w-32 sm:w-40 aspect-square rounded-full p-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
              <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden relative">
              <Image
                  src="/images/dogie.jpg"
                  alt="Profile Avatar"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  style={{ objectFit: "cover" }}
                  className="rounded-full"
                />

              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex-1 space-y-4 w-full">
            <h2 className="text-xl sm:text-2xl font-bold break-words">Juan Dela Cruz</h2>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3 w-full">
              <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs sm:text-sm font-medium transition w-full">
                <Search className="w-4 h-4" /> Find Matches
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs sm:text-sm font-medium transition w-full">
                <Settings className="w-4 h-4" /> Settings
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/20 border border-white/10 text-red-400 text-xs sm:text-sm font-medium transition col-span-2 sm:col-span-1 w-full">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </motion.div>

        {/* Social Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Followers", value: 0 },
            { icon: UserPlus, label: "Following", value: 0 },
            { icon: Heart, label: "My Friends", value: 0 },
          ].map((stat, idx) => (
            <button
              key={idx}
              className="bg-gray-800/40 backdrop-blur-md rounded-xl py-5 border border-white/10 text-center hover:bg-gray-800/60 transition shadow-md w-full"
            >
              <stat.icon className="w-6 h-6 mx-auto text-pink-400" />
              <p className="text-sm font-semibold mt-1">{stat.label}</p>
              <span className="text-xs text-gray-400">{stat.value}</span>
            </button>
          ))}
        </div>

        {/* Date Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 w-full"
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
          className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 w-full"
        >
          <h3 className="text-lg font-semibold">Your Date Plans</h3>
          <p className="text-sm text-gray-400 mt-2">No date plans yet</p>
        </motion.div>

       {/* Posts Section */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3, duration: 0.6 }}
  className="space-y-4 w-full"
>
  {/* Create Post */}
  <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-md w-full">
    <textarea
      className="w-full bg-gray-900/30 text-white p-3 rounded-lg placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-400"
      placeholder="What's on your mind?"
      value={newPost}
      onChange={(e) => setNewPost(e.target.value)}
      rows={3}
    />

    {/* Image Preview */}
    {previewImage && (
      <div className="mt-2 w-full h-40 relative rounded-lg overflow-hidden">
        <Image
          src={previewImage}
          alt="Preview"
          fill
          style={{ objectFit: "cover" }}
          className="rounded-lg"
        />
      </div>
    )}

    {/* Controls */}
    <div className="flex justify-end items-center mt-2 gap-2 flex-wrap">
      {/* Image Upload - on left */}
      <label className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg text-white cursor-pointer transition flex items-center justify-center">
        <ImagePlus className="w-5 h-5" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewImage(URL.createObjectURL(file));
          }}
        />
      </label>

      {/* Post Button */}
      <button
        onClick={handlePost}
        className="bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded-lg text-white font-medium transition flex items-center gap-1"
      >
        Post
      </button>
    </div>
  </div>

  {/* Posts List */}
  {posts.map((post, idx) => (
    <div
      key={idx}
      className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-md w-full"
    >
      <p className="text-sm text-white">{post.text}</p>

      {/* Post Image */}
      {post.image && (
        <div className="mt-2 w-full h-40 relative rounded-lg overflow-hidden">
          <Image
            src={post.image}
            alt="Post Image"
            fill
            style={{ objectFit: "cover" }}
            className="rounded-lg"
          />
        </div>
      )}

      {/* Optional Likes / Reactions */}
      <div className="flex items-center mt-2 text-gray-300 text-sm gap-1">
        <Heart className="w-4 h-4 text-pink-500" /> 5 Likes
      </div>
    </div>
  ))}
</motion.div>




      </section>

      {/* Bottom / Expanded Navigation */}
  <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[95%] max-w-lg md:max-w-4xl lg:max-w-6xl rounded-2xl bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md border border-white/20 flex justify-around items-center py-3 md:py-4 lg:py-5 text-sm lg:text-base text-white shadow-lg">
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
