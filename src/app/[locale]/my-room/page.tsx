"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import BottomNav from "@/components/BottomNav";

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

import EditProfileModal from "@/components/EditProfileModal";

interface UserType {
  id: number;
  username: string;
  month: number;
  day: number;
  year: number;
  photo_file_path: string;
  city: string;
  country_id: number;
  country_name: string;
  details_id: number | null;
  currentcountry_id: number | null;
  current_country_name?: string | null;
  currentpostal: string | null;
  currentcity: string | null;
  postal?: string;
  gender_id?: number | null;
  ethnicity_id?: number | null;
  zodiac_id?: number | null;
  lookingfor?: number[];

  // ✅ New fields from API
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  friends_count?: number;
}

interface PostType {
  text: string;
  comments: string[];
  showComments?: boolean;
  showAll?: boolean;
  image?: string;
}

export default function MyRoomPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [countries, setCountries] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [ethnicities, setEthnicities] = useState<any[]>([]);
  const [zodiacs, setZodiacs] = useState<any[]>([]);
  const [lookingfor, setLookingfor] = useState<any[]>([]);

  const t = useTranslations("ProfileSection");

  useEffect(() => {
    // Get user_id from localStorage (set during registration/login)
    const id = localStorage.getItem("user_id");
    if (!id) return; // no user_id yet
  
    setUserId(id);
  
    fetch(`/api/user?user_id=${id}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(console.error);
  }, []);
  

  useEffect(() => {
    Promise.all([
      fetch("/api/countries").then((res) => res.json()),
      fetch("/api/genders").then((res) => res.json()),
      fetch("/api/ethnicities").then((res) => res.json()),
      fetch("/api/zodiacs").then((res) => res.json()),
      fetch("/api/lookingfor").then((res) => res.json()),
    ])
      .then(([c, g, e, z, l]) => {
        setCountries(c);
        setGenders(g);
        setEthnicities(e);
        setZodiacs(z);
        setLookingfor(l);
      })
      .catch(console.error);
  }, []);

  const getAge = (year: number) => new Date().getFullYear() - year;

  const [posts, setPosts] = useState<PostType[]>([
    {
      text: "Sample post! Welcome to soulsyncai.",
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

  const stats = [
    { icon: Users, label: t("followers"), value: 0 },
    { icon: UserPlus, label: t("following"), value: 0 },
    { icon: Heart, label: t("myFriends"), value: 0 },
  ];

  

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

      {!user ? (
        // Skeleton Loader
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg 
                     flex flex-col items-center sm:flex-row sm:items-start gap-6 w-full animate-pulse"
        >
          {/* Avatar Skeleton */}
          <div className="w-32 sm:w-40 aspect-square rounded-full bg-gray-700" />

          {/* Info Skeleton */}
          <div className="flex-1 space-y-4 w-full text-center sm:text-left">
            <div className="h-6 w-1/3 bg-gray-700 rounded mx-auto sm:mx-0" />
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs sm:text-sm">
              <div className="h-4 w-16 bg-gray-700 rounded" />
              <div className="h-4 w-20 bg-gray-700 rounded" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-2/3 bg-gray-700 rounded mx-auto sm:mx-0" />
              <div className="h-4 w-1/2 bg-gray-700 rounded mx-auto sm:mx-0" />
              <div className="h-4 w-2/3 bg-gray-700 rounded mx-auto sm:mx-0" />
            </div>
          </div>
        </motion.div>
      ) : (
        // Actual Profile UI
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg 
                     flex flex-col items-center sm:flex-row sm:items-start gap-6 w-full"
        >
          <button
            onClick={() => setIsEditOpen(true)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs sm:text-sm text-pink-400 transition"
          >
            <Edit className="w-4 h-4" /> {t("editProfile")}
          </button>

          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="w-32 sm:w-40 aspect-square rounded-full p-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
              <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden relative">
                <Image
                  src={user.photo_file_path || "/images/default-avatar.jpg"}
                  alt="Profile Avatar"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  style={{ objectFit: "cover" }}
                  className="rounded-full"
                />
              </div>
            </div>
          </div>


          {/* Info */}
          <div className="flex-1 space-y-4 w-full text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold break-words">{user.username}</h2>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs sm:text-sm text-gray-400">
              <span>{user.posts_count ?? 0} {t("posts")}</span>
              <span>{user.followers_count ?? 0} {t("followers")}</span>
              <span>{user.following_count ?? 0} {t("following")}</span>
            </div>

            <div className="space-y-1 text-sm text-gray-300">
              <p className="flex justify-center sm:justify-start items-center gap-2">
                <User className="w-4 h-4 text-pink-400" />
                {t("yearsOld", {
                  age: getAge(user.year),
                  month: user.month,
                  day: user.day,
                  year: user.year
                })}
              </p>
              <p className="flex justify-center sm:justify-start items-center gap-2">
                <Home className="w-4 h-4 text-pink-400" /> {t("home")}: {user.city}, {user.country_name} ({user.postal})
              </p>
              <p className="flex justify-center sm:justify-start items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-400" /> {t("current")}:{" "}
                {user.currentcity || user.city}, {user.current_country_name || user.country_name} (
                {user.currentpostal || user.postal})
              </p>
            </div>

            {/* Actions / Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4 w-full">
              {/* Find Matches with animated gradient */}
              <motion.button
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs sm:text-sm font-medium col-span-2 sm:col-span-1 w-full shadow-md"
                style={{
                  background: "linear-gradient(45deg, #ec4899, #8b5cf6, #6366f1, #ec4899)",
                  backgroundSize: "300% 300%"
                }}
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Search className="w-4 h-4" /> {t("findMatches")}
              </motion.button>

              <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs sm:text-sm font-medium transition w-full">
                <Settings className="w-4 h-4" /> {t("settings")}
              </button>

              <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/20 border border-white/10 text-red-400 text-xs sm:text-sm font-medium transition w-full">
                <LogOut className="w-4 h-4" /> {t("logout")}
              </button>
            </div>
          </div>
        </motion.div>
      )}


      {/* ✅ Modal */}
      {user && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          user={user}
          countries={countries}
          genders={genders}
          ethnicities={ethnicities}
          zodiacs={zodiacs}
          lookingfor={lookingfor}
          onUpdate={(updatedUser) => setUser(updatedUser)} // ✅ updates local state
        />
      )}



        {/* Social Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat, idx) => (
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
          <Calendar className="w-5 h-5 text-pink-400" /> {t("datePlans")}
        </h3>
        <div className="flex flex-col items-center text-center py-6">
          <Calendar className="w-10 h-10 text-pink-400 mb-2" />
          <p className="text-sm text-gray-400">{t("noActiveConversations")}</p>
          <p className="text-sm text-pink-400">{t("startMatching")}</p>
        </div>
      </motion.div>

      {/* Your Date Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 w-full"
      >
        <h3 className="text-lg font-semibold">{t("yourDatePlans")}</h3>
        <p className="text-sm text-gray-400 mt-2">{t("noDatePlans")}</p>
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
        placeholder={t("whatsOnYourMind")}
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
        rows={3}
      />

      {/* Image Preview */}
      {previewImage && (
        <div className="mt-2 w-full h-40 relative rounded-lg overflow-hidden">
          <Image
            src={previewImage}
            alt={t("preview")}
            fill
            style={{ objectFit: "cover" }}
            className="rounded-lg"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-end items-center mt-2 gap-2 flex-wrap">
        {/* Image Upload */}
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
          {t("post")}
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
            sizes="(max-width: 768px) 100vw, 50vw" // ✅ add this
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
      <BottomNav />






    </main>
    
  );
}
