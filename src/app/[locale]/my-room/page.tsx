"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import BottomNav from "@/components/BottomNav";
import { useRouter, usePathname } from "next/navigation";
import {useRef } from "react";
import { useNotification } from "@/context/NotificationContext";
import AuthGuard from "@/components/AuthGuard"; // adjust path if needed

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
  Check,
  ImagePlus,
  Pencil,
  Trash2, 
  Camera,
} from "lucide-react";

import EditProfileModal from "@/components/EditProfileModal";

// -------------------- Types --------------------
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

  // ✅ Optional
  quote?: string | null;
}

interface ScheduleType {
  id: number;
  sender_id: number;
  receiver_id: number;
  proposed_date: string;
  location: string;
  activity: string;
  vibe: string;
  status: string;
  rescheduled_date?: string;
  ai_plan: string;
}

// --------- Updated PostType ----------
export type PostType = {
  id: number;
  user_id: number;
  text: string;
  image?: string | null; // allow null too
  image_path?: string;
  image_name?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  isLikedByCurrentUser?: boolean;
};

// -------------------- Component --------------------
export default function MyRoomPage() {
  // ✅ States
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [ethnicities, setEthnicities] = useState<any[]>([]);
  const [zodiacs, setZodiacs] = useState<any[]>([]);
  const [lookingfor, setLookingfor] = useState<any[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<PostType[]>([]);
  const [newPost, setNewPost] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewAvatarSelected, setIsNewAvatarSelected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPostImage, setPreviewPostImage] = useState<string | null>(null);
  const [editingPostFile, setEditingPostFile] = useState<File | null>(null);

  const [createPostFile, setCreatePostFile] = useState<File | null>(null);    
  const [originalEditingImagePath, setOriginalEditingImagePath] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const { showNotification } = useNotification();

  // ⬇ Infinite scroll states
  const [page, setPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  const [editingPostText, setEditingPostText] = useState<string>("");
  const [editingPostImage, setEditingPostImage] = useState<string | null>(null);

  const POSTS_PER_PAGE = 10;
  const lastPostRef = useRef<HTMLDivElement | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const t = useTranslations("ProfileSection");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1]?.split("-")[0] ?? "en";

  // BACKGROUND COLOR
  const [bgClass, setBgClass] = useState(
    "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200"
  );


// ⬇ display schedule
const [schedules, setSchedules] = useState<ScheduleType[]>([]);
const [loadingSchedules, setLoadingSchedules] = useState(true);

// Calendar states
const now = new Date();
const [calendarMonth, setCalendarMonth] = useState(now.getMonth()); // 0-indexed
const [calendarYear, setCalendarYear] = useState(now.getFullYear());
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [selectedSchedules, setSelectedSchedules] = useState<ScheduleType[]>([]);
const [modalOpen, setModalOpen] = useState(false);

// -------------------- date schedule display --------------------
useEffect(() => {
  if (!userId) return;

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await fetch(`/api/ai/datescheduler?user_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules || []);
      } else {
        console.error("Failed to fetch schedules:", data.error);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  fetchSchedules();
}, [userId]);

  // BACKGROUND COLOR

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    fetch(`/api/user/background?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.background_classes) {
          setBgClass(data.background_classes);
        }
      })
      .catch(err => console.error("Failed to fetch user background:", err));
  }, []);


// -------------------- Filter schedules --------------------
// Pending schedules this month
const pendingSchedules = schedules.filter((s: ScheduleType) => {
  const d = new Date(s.proposed_date);
  return (
    s.status === "pending" &&
    d.getMonth() === calendarMonth &&
    d.getFullYear() === calendarYear
  );
});

// Active schedules this month (accepted or rescheduled)
const activeSchedules = schedules.filter((s: ScheduleType) => {
  const dateToCheck = s.rescheduled_date || s.proposed_date;
  const d = new Date(dateToCheck);
  return (
    (s.status === "accepted" || !!s.rescheduled_date) &&
    d.getMonth() === calendarMonth &&
    d.getFullYear() === calendarYear
  );
});

// -------------------- Map schedules per date for calendar --------------------
const schedulesMap: Record<string, ScheduleType[]> = {};
activeSchedules.forEach((s) => {
  const dateStr = new Date(s.rescheduled_date || s.proposed_date).toDateString();
  if (!schedulesMap[dateStr]) schedulesMap[dateStr] = [];
  schedulesMap[dateStr].push(s);
});

// -------------------- Helper to get all days in current calendar month --------------------
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};
const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);

// -------------------- Handle date click --------------------
const handleDateClick = (date: Date) => {
  const dateStr = date.toDateString();
  const schedulesForDate = schedulesMap[dateStr] || [];
  if (schedulesForDate.length > 0) {
    setSelectedDate(date);
    setSelectedSchedules(schedulesForDate);
    setModalOpen(true);
  }
};




  // -------------------- Effects --------------------
  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) return;
    setUserId(id);

    // Fetch user info
    fetch(`/api/user?user_id=${id}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchPosts(1);
  }, [userId]);

  useEffect(() => {
    // IntersectionObserver for infinite scroll
    if (loadingPosts || !hasMorePosts) return;

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((prev) => prev + 1);
      }
    });

    if (lastPostRef.current) {
      observer.current.observe(lastPostRef.current);
    }

    return () => {
      if (lastPostRef.current && observer.current) {
        observer.current.unobserve(lastPostRef.current);
      }
    };
  }, [loadingPosts, hasMorePosts]);

  useEffect(() => {
    if (page === 1) return;
    fetchPosts(page);
  }, [page]);

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

  // -------------------- Helpers --------------------
  const getAge = (year: number) => new Date().getFullYear() - year;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

// -------------------- Open Edit Modal --------------------
const openEditModal = (post: PostType) => {
  setEditingPostId(post.id);
  setEditingPostText(post.text);
  // set preview to the existing image_path (if any)
  setEditingPostImage(post.image_path ?? null);
  // store the original path so we can detect removal
  setOriginalEditingImagePath(post.image_path ?? null);
  // clear any leftover file state
  setEditingPostFile(null);
  setIsModalOpen(true);
};


  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("avatar", selectedFile);
    formData.append("user_id", userId!);

    try {
      const res = await fetch("/api/update-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) =>
          prev ? { ...prev, photo_file_path: data.photo_file_path } : prev
        );
        setSelectedFile(null);
        setPreviewImage(null);
      }
    } catch (err) {
      console.error("Failed to update avatar:", err);
    }
  };


  const handleFindMatches = () => {
    router.push(`/${locale}/finding-match`);
  };
  
  const settings = () => {
    router.push(`/${locale}/setting`);
  };
  
  
  
  
  const handleLogout = () => {
    // 🚨 Clear user session
    localStorage.removeItem("user_id");

    // Redirect to homepage (page.tsx)
    router.replace("/");
  };

  // -------------------- Fetch posts with pagination --------------------
  const fetchPosts = async (pageNumber: number) => {
    if (!userId) return;
    setLoadingPosts(true);

    try {
      const res = await fetch(
        `/api/posts?user_id=${userId}&current_user_id=${userId}&limit=${POSTS_PER_PAGE}&offset=${
          (pageNumber - 1) * POSTS_PER_PAGE
        }`
      );
      const data: PostType[] = await res.json();

      const normalized = data.map((p) => ({
        ...p,
        image: p.image_path ?? null,
        isLikedByCurrentUser: p.isLikedByCurrentUser ?? false,
      }));

      if (pageNumber === 1) {
        setPosts(normalized);
      } else {
        setPosts((prev) => [...prev, ...normalized]);
      }

      if (normalized.length < POSTS_PER_PAGE) {
        setHasMorePosts(false);
      } else {
        setHasMorePosts(true);
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

// -------------------- Handle Post (Create / Update) --------------------
const handlePost = async () => {
  if (!newPost.trim() && !editingPostText.trim()) return;

  setLoading(true);

  const formData = new FormData();
  formData.append("user_id", userId!);

  const text = editingPostId ? editingPostText : newPost;
  formData.append("text", text);

  let imageFileToUpload: File | null = null;

  if (editingPostId) {
    if (editingPostFile) {
      imageFileToUpload = editingPostFile;
    } else {
      if (originalEditingImagePath && editingPostImage == null) {
        formData.append("remove_image", "true");
      }
    }
  } else {
    if (createPostFile) {
      imageFileToUpload = createPostFile;
    }
  }

  if (imageFileToUpload) {
    formData.append("image", imageFileToUpload);
  }

  const url = editingPostId ? `/api/posts/${editingPostId}` : "/api/posts";
  const method: "POST" | "PUT" = editingPostId ? "PUT" : "POST";

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (data.success && data.post) {
      setPosts((prev) =>
        editingPostId
          ? prev.map((p) =>
              p.id === editingPostId
                ? {
                    ...data.post,
                    // preserve existing like state if backend doesn’t return it
                    likes_count: data.post.likes_count ?? p.likes_count,
                    isLikedByCurrentUser:
                      data.post.isLikedByCurrentUser ?? p.isLikedByCurrentUser,
                  }
                : p
            )
          : [data.post, ...prev]
      );      

      // ✅ show notification here
      if (editingPostId) {
        showNotification("✨ Your post has been updated!");
      } else {
        showNotification("🎉 Your post has been published!");
      }


      // reset states
      setNewPost("");
      setPreviewImage(null);
      setCreatePostFile(null);
      setEditingPostId(null);
      setEditingPostText("");
      setEditingPostImage(null);
      setEditingPostFile(null);
      setOriginalEditingImagePath(null);

      setTimeout(() => setIsModalOpen(false), 300);
    } else {
      console.error("❌ Failed to create/update post:", data);
      showNotification("❌ Failed to save post. Please try again.");
    }
  } catch (err) {
    console.error("❌ Failed to create/update post:", err);
    showNotification("❌ Server error. Please try again.");
  } finally {
    setLoading(false);
  }
};


  // -------------------- Toggle Like --------------------
  const handleToggleLike = async (postId: number, isLiked: boolean) => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
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

  // -------------------- Memoized stats --------------------
  const stats = useMemo(
    () => [
      { icon: Users, label: t("followers"), value: user?.followers_count ?? 0 },
      { icon: UserPlus, label: t("following"), value: user?.following_count ?? 0 },
      { icon: Heart, label: t("myFriends"), value: user?.friends_count ?? 0 },
    ],
    [user, t]
  );

  

  return (
    <AuthGuard>
  <main className={`relative min-h-screen ${bgClass} pb-24 transition-all duration-500`}>
  

      
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-60 sm:w-72 h-60 sm:h-72 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-60 sm:w-72 h-60 sm:h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-300" />
      </div>
  
      {/* Header */}
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
  {t("myRoom")}
</h1>

      </div>


{/* Profile Section */}
<section className="max-w-4xl mx-auto py-8 space-y-4">

      {!user ? (
            // Skeleton Loader
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg 
                        flex flex-col items-center sm:flex-row sm:items-start gap-6 w-full max-w-4xl mx-auto animate-pulse"
            >
              {/* Avatar Skeleton */}
              <div className="w-32 sm:w-40 aspect-square rounded-full bg-gray-700" />

              {/* Info Skeleton */}
              <div className="flex-1 min-w-0 space-y-4 w-full text-center sm:text-left">
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
                        flex flex-col items-center sm:flex-row sm:items-start gap-6 w-full max-w-4xl mx-auto"
            >


<div className="flex-shrink-0 flex flex-col items-center relative">
  <input
    type="file"
    accept="image/*"
    className="hidden"
    ref={fileInputRef}
    onChange={(e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewAvatar(event.target?.result as string); // update circle
        };
        reader.readAsDataURL(file);

        setIsNewAvatarSelected(true); // mark new avatar selected
      }
    }}
  />

  <div
    className="w-32 sm:w-40 aspect-square rounded-full p-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 cursor-pointer relative"
    onClick={() => {
      if (!previewAvatar) {
        setPreviewAvatar(user?.photo_file_path || "/images/default-avatar.jpg"); // preview old avatar
      }
      setIsModalOpen(true);
    }}
  >
    <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden relative">
      <Image
        src={previewAvatar || user?.photo_file_path || "/images/default-avatar.jpg"}
        alt="Profile Avatar"
        fill
        priority
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        style={{ objectFit: "cover" }}
        className="rounded-full"
      />

      {/* -------------------- Overlay for New Avatar & Uploading -------------------- */}
      {isNewAvatarSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center space-x-3 bg-black/30 rounded-full"
        >
          {/* Save */}
          <div
            className="bg-green-500 p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transform transition flex items-center justify-center"
            onClick={async (e) => {
              e.stopPropagation();
              if (!selectedFile) return;

              setIsUploading(true); // start loading

              const formData = new FormData();
              formData.append("avatar", selectedFile);
              formData.append("user_id", userId!);

              try {
                const res = await fetch("/api/update-avatar", {
                  method: "POST",
                  body: formData,
                });
                const data = await res.json();
                if (data.success) {
                  setUser((prev) =>
                    prev ? { ...prev, photo_file_path: data.photo_url } : prev
                  );
                  setPreviewAvatar(data.photo_url); // reflect in circle
                }
              } catch (err) {
                console.error("Failed to save avatar:", err);
              } finally {
                setSelectedFile(null);
                setIsNewAvatarSelected(false); // hide overlay
                setIsUploading(false); // stop loading
              }
            }}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Check className="h-5 w-5 text-white" />
            )}
          </div>

          {/* Cancel */}
          <div
            className="bg-red-500 p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transform transition"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewAvatar(user?.photo_file_path || "/images/default-avatar.jpg");
              setSelectedFile(null);
              setIsNewAvatarSelected(false);
            }}
          >
            <X className="h-5 w-5 text-white" />
          </div>
        </motion.div>
      )}

      {/* -------------------- Uploading Overlay on Circle -------------------- */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Show Edit button only if a new avatar is NOT selected */}
      {!isNewAvatarSelected && !isUploading && (
        <div
          className="absolute bottom-2 right-5 bg-white bg-opacity-10 rounded-full p-1 hover:bg-opacity-20 transition-opacity duration-200 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            
            fileInputRef.current?.click();
          }}
        >
          <Edit className="h-5 w-5 text-gray-800" />
        </div>
      )}
    </div>
  </div>
</div>

     

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-4 w-full">
                {/* Username + Edit Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                  {/* On mobile → username centered, edit snug to the right */}
                  <div className="relative w-full sm:hidden flex justify-center">
                    <div className="relative inline-block">
                      <h2 className="text-xl font-bold break-words text-center truncate">{user.username}</h2>

                      <button
                        onClick={() => setIsEditOpen(true)}
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center gap-1 px-2 py-1 rounded-lg
                                  bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-pink-400 transition"
                      >
                        <Edit className="w-4 h-4" /> <span className="ml-1">{t("editProfile")}</span>
                      </button>
                    </div>
                  </div>

                  {/* On larger screens → left aligned username + edit */}
                  <div className="hidden sm:flex items-center gap-3 min-w-0">
                    <h2 className="text-2xl font-bold break-words truncate">{user.username}</h2>
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm text-pink-400 transition"
                    >
                      <Edit className="w-4 h-4" /> {t("editProfile")}
                    </button>
                  </div>
                </div>

                {/* Quote */}
                {user.quote && (
                  <p className="text-gray-400 italic text-center sm:text-left text-sm mt-1 break-words whitespace-pre-line">
                    “{user.quote}”
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-center sm:justify-start gap-6 mt-2 text-center">
                  <div>
                    <div className="font-bold text-lg">{user.posts_count ?? 0}</div>
                    <div className="text-gray-400 text-xs sm:text-sm">{t("posts")}</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg">{user.following_count ?? 0}</div>
                    <div className="text-gray-400 text-xs sm:text-sm">{t("following")}</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg">{user.followers_count ?? 0}</div>
                    <div className="text-gray-400 text-xs sm:text-sm">{t("followers")}</div>
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-1 text-sm text-gray-300 mt-2">
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

                {/* Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4 w-full">
                   <motion.button
                      onClick={handleFindMatches}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs sm:text-sm font-medium col-span-2 sm:col-span-1 w-full shadow-md"
                      style={{
                        background: "linear-gradient(45deg, #ec4899, #8b5cf6, #6366f1, #ec4899)",
                        backgroundSize: "300% 300%",
                      }}
                      animate={{
                        backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Search className="w-4 h-4" /> {t("findMatches")}
                    </motion.button>

                    <button
                    onClick={settings} // <-- add this
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs sm:text-sm font-medium transition w-full"
                  >
                    <Settings className="w-4 h-4" /> {t("settings")}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/20 border border-white/10 text-red-400 text-xs sm:text-sm font-medium transition w-full"
                  >
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
<div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
  {!user ? (
    // Skeleton Loader
    Array.from({ length: 3 }).map((_, idx) => (
      <div
        key={idx}
        className="flex flex-col items-center justify-center 
                   bg-gray-800/40 backdrop-blur-md rounded-2xl 
                   py-4 px-2 border border-white/10 shadow-md w-full 
                   animate-pulse"
      >
        <div className="w-6 h-6 mb-2 rounded-full bg-gray-700" />
        <div className="h-4 w-16 bg-gray-700 rounded mb-1" />
        <div className="h-3 w-10 bg-gray-700 rounded" />
      </div>
    ))
  ) : (
    stats.map((stat, idx) => (
      <button
        key={idx}
        onClick={() => {
          if (stat.label === t("followers")) {
            router.push(`/${locale}/followers`);
          }
          if (stat.label === t("following")) {
            router.push(`/${locale}/following`);
          }
          if (stat.label === t("myFriends")) {
            router.push(`/${locale}/myfriends`);
          }
        }}
        className="flex flex-col items-center justify-center 
                   bg-gray-800/40 backdrop-blur-md rounded-2xl 
                   py-4 px-2 border border-white/10 shadow-md w-full 
                   hover:bg-gray-800/60 hover:scale-105 active:scale-95 
                   transition-transform duration-200"
      >
        <stat.icon className="w-6 h-6 text-pink-400 mb-1" />
        <p className="text-sm font-semibold">{stat.label}</p>
        <span className="text-xs text-gray-400">{stat.value}</span>
      </button>
    ))
  )}
</div>

{/* --------------------  Date Plans (Calendar View) -------------------- */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1, duration: 0.6 }}
  className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 w-full"
>
  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
    <Calendar className="w-5 h-5 text-pink-400" /> {t("datePlans")}
  </h3>

  {/* Month Navigation */}
  <div className="flex justify-between items-center mb-2">
    <button
      onClick={() => {
        if (calendarMonth === 0) {
          setCalendarMonth(11);
          setCalendarYear(calendarYear - 1);
        } else setCalendarMonth(calendarMonth - 1);
      }}
      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition"
    >
      Previous
    </button>
    <span className="font-semibold">
      {new Date(calendarYear, calendarMonth).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })}
    </span>
    <button
      onClick={() => {
        if (calendarMonth === 11) {
          setCalendarMonth(0);
          setCalendarYear(calendarYear + 1);
        } else setCalendarMonth(calendarMonth + 1);
      }}
      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition"
    >
      Next
    </button>
  </div>

  {/* Calendar Grid */}
  <div className="grid grid-cols-7 gap-2 text-center">
    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => (
      <div key={day} className="font-semibold text-gray-400">{day}</div>
    ))}

    {loadingSchedules
      ? // Skeleton Loader for calendar
        Array.from({ length: daysInMonth.length }).map((_, idx) => (
          <div
            key={idx}
            className="h-10 w-10 rounded-full bg-gray-700 animate-pulse"
          />
        ))
      : daysInMonth.map((date) => {
          const dateStr = date.toDateString();
          const hasSchedule = schedulesMap[dateStr]?.length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date)}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition
                ${hasSchedule ? "bg-pink-400 text-white font-bold" : "hover:bg-gray-700 text-gray-200"}
                ${selectedDate?.toDateString() === dateStr ? "ring-2 ring-pink-500" : ""}`}
            >
              {date.getDate()}
            </button>
          );
        })}
  </div>
</motion.div>

{/* -------------------- Schedule Modal -------------------- */}
{modalOpen && (
  <div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    onClick={() => setModalOpen(false)}
  >
    <div
      className="bg-gray-800/80 rounded-2xl shadow-lg p-5 w-full max-w-md relative"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold text-white mb-4">
        {selectedDate?.toDateString()}
      </h3>
      <button
        className="absolute top-3 right-3 text-gray-400 hover:text-white"
        onClick={() => setModalOpen(false)}
      >
        ✕
      </button>

      <div className="space-y-3">
        {loadingSchedules
          ? // Skeleton for modal
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-gray-700/50 p-3 rounded-xl animate-pulse flex flex-col gap-2"
              >
                <div className="h-4 w-1/2 bg-gray-600 rounded" />
                <div className="h-3 w-2/3 bg-gray-600 rounded" />
                <div className="h-3 w-1/4 bg-gray-600 rounded" />
              </div>
            ))
          : selectedSchedules.map((s) => (
              <div
                key={s.id}
                className="bg-gray-700/50 p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center"
              >
                <div className="space-y-1">
                  <p className="text-sm sm:text-base text-white font-semibold">
                    {new Date(s.proposed_date).toLocaleString()}
                  </p>
                  {s.rescheduled_date && (
                    <p className="text-xs text-yellow-400">
                      Rescheduled: {new Date(s.rescheduled_date).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-gray-300">{s.activity}</p>
                  <p className="text-xs sm:text-sm text-gray-400">{s.location}</p>
                  <p className="text-xs sm:text-sm text-pink-400">{s.vibe}</p>
                  {s.ai_plan && (
                    <p className="text-xs sm:text-sm text-gray-200 mt-1">AI Plan: {s.ai_plan}</p>
                  )}
                </div>
                <span
                  className={`mt-2 sm:mt-0 px-2 py-1 rounded-lg text-xs font-semibold ${
                    s.status === "accepted"
                      ? "bg-green-500 text-white"
                      : s.rescheduled_date
                      ? "bg-yellow-500 text-gray-900"
                      : "bg-purple-500 text-white"
                  }`}
                >
                  {s.rescheduled_date ? "RESCHEDULED" : s.status.toUpperCase()}
                </span>
              </div>
            ))}
      </div>
    </div>
  </div>
)}

{/* -------------------- Your Date Plans (Pending) -------------------- */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2, duration: 0.6 }}
  className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 w-full mt-4"
>
  <h3 className="text-lg font-semibold">{t("yourDatePlans")}</h3>

  {loadingSchedules
    ? // Skeleton for pending plans
      Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-gray-700/50 p-3 rounded-xl animate-pulse flex flex-col gap-2 mt-2"
        >
          <div className="h-4 w-1/3 bg-gray-600 rounded" />
          <div className="h-3 w-2/3 bg-gray-600 rounded" />
          <div className="h-3 w-1/4 bg-gray-600 rounded" />
        </div>
      ))
    : pendingSchedules.length === 0 ? (
        <p className="text-sm text-gray-400 mt-2">{t("noDatePlans")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {pendingSchedules.map((s) => (
            <li
              key={s.id}
              className="bg-gray-700/50 p-2 rounded-lg flex flex-col sm:flex-row sm:justify-between items-start sm:items-center hover:bg-gray-700/70 transition"
            >
              <div className="space-y-1">
                <p className="text-sm text-white font-semibold">{s.activity}</p>
                <p className="text-xs text-gray-400">{s.location}</p>
                <p className="text-xs text-pink-400">{s.vibe}</p>
                <p className="text-xs text-gray-300">
                  {new Date(s.proposed_date).toLocaleString()}
                </p>
              </div>
              <span className="mt-2 sm:mt-0 px-2 py-1 rounded-lg text-xs font-semibold bg-yellow-500 text-gray-900">
                PENDING
              </span>
            </li>
          ))}
        </ul>
      )}
</motion.div>





      <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3, duration: 0.6 }}
  className="space-y-4 w-full"
>
  {/* -------------------- Create Post -------------------- */}
{!editingPostId && (
  <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-md w-full">
    {/* Post Text */}
    <textarea
      className="w-full bg-gray-900/30 text-white p-3 rounded-lg placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-400"
      placeholder={t("whatsOnYourMind")}
      value={newPost}
      onChange={(e) => setNewPost(e.target.value)}
      rows={3}
    />

    {/* Image Preview */}
    <div className="mt-2 w-full h-40 relative rounded-lg overflow-hidden border border-white/10">
      {previewImage ? (
        <>
          <Image
            src={previewImage}
            alt={t("preview")}
            fill
            style={{ objectFit: "cover" }}
            className="rounded-lg"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            {/* Remove Image */}
            <button
              onClick={() => {
                setPreviewImage(null);
                setCreatePostFile(null); // also clear the file
              }}
              className="bg-red-500 hover:bg-red-600 p-1 rounded-full flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>

            {/* Replace Image */}
            <label className="bg-blue-500 hover:bg-blue-600 p-1 rounded-full flex items-center justify-center cursor-pointer">
              <Camera className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
            // when user selects a file for creating a post:
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPreviewImage(URL.createObjectURL(file)); // preview in UI
                  setCreatePostFile(file);                    // real File for upload
                }
              }}

              />
            </label>
          </div>
        </>
      ) : (
        // No image yet: option to add new
        <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-gray-800/50 rounded-lg hover:bg-gray-700/60 transition">
          <Camera className="w-6 h-6 text-white" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPreviewImage(URL.createObjectURL(file));
                setCreatePostFile(file); // save file for API
              }
            }}
          />
        </label>
      )}
    </div>

    {/* Controls */}
    <div className="flex justify-end items-center mt-2 gap-2 flex-wrap">
      <button
        onClick={handlePost}
        className="bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded-lg text-white font-medium transition flex items-center gap-1"
      >
        {t("post")}
      </button>
    </div>
  </div>
)}



  {/* -------------------- Posts List -------------------- */}
  {posts.length === 0 && !loadingPosts ? (
    <div className="text-gray-400 text-center py-10">
      {t("noPostsAvailable")}
    </div>
  ) : (
    posts.map((post) => (
      <div
        key={post.id}
        className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-md w-full"
      >
        {/* Post Text */}
        <p className="text-sm text-white">{post.text}</p>

{/* Post Image */}
{post.image_path && (
  <div
    className="mt-2 w-full h-40 relative rounded-lg overflow-hidden cursor-pointer"
    onClick={() => setPreviewPostImage(post.image_path ?? null)}
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

          {/* Edit Post Icon */}
          <button
            onClick={() => openEditModal(post)}
            className="p-1 text-blue-400 hover:text-blue-500 rounded transition"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </div>
    ))
  )}

  {/* -------------------- Bottom skeleton while loading more posts -------------------- */}
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

  {/* -------------------- Edit Post Modal -------------------- */}
{isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg">
      <h3 className="text-white text-lg font-medium mb-4">{t("editPost")}</h3>

      {/* Post Text */}
      <textarea
        className="w-full bg-gray-800 text-white p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-400"
        value={editingPostText}
        onChange={(e) => setEditingPostText(e.target.value)}
        rows={4}
      />

      {/* Image Preview + Controls */}
      <div className="mt-2 w-full h-40 relative rounded-lg overflow-hidden border border-white/10">
        {editingPostImage ? (
          <>
            <Image
              src={editingPostImage}
              alt="Editing Image"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {/* Remove Image */}
              <button
                onClick={() => {
                  setEditingPostImage(null);   // remove preview
                  setEditingPostFile(null);    // remove file so save knows it's removed
                }}
                className="bg-red-500 hover:bg-red-600 p-1 rounded-full flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>

              {/* Replace Image */}
              <label className="bg-blue-500 hover:bg-blue-600 p-1 rounded-full flex items-center justify-center cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                    // Replace Image (inside modal)
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditingPostFile(file);                      // upload this file
                        setEditingPostImage(URL.createObjectURL(file)); // preview it
                      }
                    }}
                />
              </label>
            </div>
          </>
        ) : (
          // No image yet: option to add new
          <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-gray-800/50 rounded-lg hover:bg-gray-700/60 transition">
            <Camera className="w-6 h-6 text-white" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
                // Replace Image (inside modal)
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditingPostFile(file);                      // upload this file
                    setEditingPostImage(URL.createObjectURL(file)); // preview it
                  }
                }}
            />
          </label>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => setIsModalOpen(false)}
          className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
        >
          {t("cancel")}
        </button>
        <button
          onClick={handlePost}
          className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition"
        >
          {t("save")}
        </button>
      </div>
    </div>
  </div>
)}


</motion.div>





      </section>

      {/* Bottom / Expanded Navigation */}
      <BottomNav />

{/* Spinner overlay */}
<AnimatePresence>
  {loading && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50"
    >
      {/* Spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
        className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full"
      />

      {/* Text */}
      <p className="mt-4 text-white text-sm font-medium">Please wait...</p>
    </motion.div>
  )}
</AnimatePresence>



{/* -------------------- Preview Modal -------------------- */}

<AnimatePresence>
  {isModalOpen && previewAvatar && (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setIsModalOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-full max-w-md h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={previewAvatar}
          alt="Preview"
          fill
          className="object-contain rounded-xl"
        />
        {/* Only show X to close old avatar preview */}
        {!isNewAvatarSelected && (
          <div
            className="absolute top-4 right-4 text-white cursor-pointer"
            onClick={() => setIsModalOpen(false)}
          >
            <X className="h-6 w-6" />
          </div>
        )}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* Preview Modal */}
<AnimatePresence>
  {previewPostImage && (
    <motion.div
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setPreviewPostImage(null)}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-full max-w-2xl h-[70vh]"
        onClick={(e) => e.stopPropagation()} // prevent modal close when clicking inside
      >
        <Image
          src={previewPostImage}
          alt="Preview"
          fill
          className="object-contain rounded-xl"
        />

        <div
          className="absolute top-4 right-4 text-white cursor-pointer text-2xl font-bold"
          onClick={() => setPreviewPostImage(null)}
        >
          ✖
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>




    </main>
    </AuthGuard>
  );
}
