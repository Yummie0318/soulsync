"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/AuthGuard"; // adjust path if needed


interface Island {
  id: number;
  name: string;
  description: string;
  amount: number;
  audio_path: string;
  icon: string;
}

// Skeleton Loader Component
function IslandSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto px-4 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-gray-800/40 animate-pulse aspect-square"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-full mb-4" />
          <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
          <div className="h-3 w-28 bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-700 rounded mt-3" />
        </div>
      ))}
    </div>
  );
}

export default function IslandPickerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [selectedIsland, setSelectedIsland] = useState<number | null>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);









    // BACKGROUND COLOR
    const [bgClass, setBgClass] = useState(
      "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200"
    );
  
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

    





  const t = useTranslations("IslandPicker");

  // Currency symbols per locale
  const currencyMap: Record<string, string> = {
    en: "$",
    de: "€",
    zh: "¥",
  };
  const currencySymbol = currencyMap[locale] || "$";

  // Fetch islands from API based on locale
  useEffect(() => {
    const fetchIslands = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/islands?locale=${locale}`);
        if (!res.ok) throw new Error("Failed to fetch islands");
        const data = await res.json();
        setIslands(data);
      } catch (err) {
        console.error("❌ Failed to fetch islands:", err);
        setError("Could not load islands. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchIslands();
  }, [locale]);

  // Play island sound
  const playSound = (file: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(file);
    audioRef.current = audio;
    audio.play().catch((err) => console.error("Audio play failed:", err));
  };


// Handle island selection save
const handleChooseIsland = async () => {
  if (!selectedIsland) return;

  const island = islands.find((i) => i.id === selectedIsland);
  if (!island) return;

  const user_id = localStorage.getItem("user_id");
  if (!user_id) {
    alert("⚠️ No user found. Please log in again.");
    router.push(`/${locale}/login`);
    return;
  }

  setSaving(true);
  try {
    // Save selection on backend
    const res = await fetch("/api/islands/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        island_id: island.id,
        amount: island.amount,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to select island");

    console.log("✅ Island selection saved:", data);

    // 💾 Save island locally for welcome and future pages
    localStorage.setItem("selected_island", JSON.stringify({
      id: island.id,
      name: island.name,
      description: island.description,
      icon: island.icon,
      amount: island.amount,
    }));

    // Optionally save just the ID separately for easy access in future
    localStorage.setItem("selected_island_id", island.id.toString());

    // 🚀 Navigate to island welcome page respecting locale
    router.push(`/${locale}/island-welcome`);
  } catch (err) {
    console.error("❌ Error choosing island:", err);
    alert("Something went wrong while choosing the island.");
  } finally {
    setSaving(false);
  }
};

  return (
    <AuthGuard>
<main className={`relative min-h-screen ${bgClass} text-gray-100 flex flex-col transition-all duration-500`}>

      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center text-xl sm:text-2xl font-bold">
          {t("title")}
        </h1>
      </div>

      {/* Error */}
      {error && <p className="text-center text-red-400 mt-6">{error}</p>}

      {/* Hint */}
      {!loading && !error && (
        <p className="text-center text-sm text-gray-400 mt-2">{t("hint")}</p>
      )}

      {/* Islands Grid or Skeleton */}
      {loading ? (
        <IslandSkeleton />
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-2 gap-4 sm:gap-6">
          {islands.map((island) => {
            const isSelected = selectedIsland === island.id;
            return (
              <motion.div
                key={island.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedIsland(island.id);
                  playSound(island.audio_path);
                }}
                className={`relative flex flex-col items-center justify-center rounded-2xl cursor-pointer transition p-5 sm:p-6 aspect-square
                  ${
                    isSelected
                      ? "border-2 border-pink-400 bg-white/20"
                      : "border border-white/10 bg-white/10 hover:bg-white/15"
                  }`}
              >
                <div className="text-5xl sm:text-6xl mb-3">{island.icon}</div>
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  {island.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 text-center">
                  {island.description}
                </p>
                <p className="mt-2 font-medium text-pink-400">
                  {currencySymbol}
                  {island.amount.toLocaleString(locale)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom Button */}
      <button
        onClick={handleChooseIsland}
        disabled={!selectedIsland || saving}
        className={`w-full py-3 sm:py-4 rounded-xl font-semibold transition text-center
          ${
            selectedIsland && !saving
              ? "bg-pink-500 text-white hover:bg-pink-600 shadow-lg"
              : "bg-white/10 text-gray-400 cursor-not-allowed"
          }`}
      >
        {saving ? t("saving") : t("choose")}
      </button>

      {/* Spinner overlay when saving */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
              className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
    </AuthGuard>
  );
}
