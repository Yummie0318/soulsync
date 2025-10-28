"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/AuthGuard";

interface Island {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export default function IslandWelcomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const t = useTranslations("IslandWelcome");

  const [island, setIsland] = useState<Island | null>(null);
  const [loading, setLoading] = useState(true);

  const [answeredCount, setAnsweredCount] = useState(0);
  const TOTAL_QUESTIONS = 20;
  const progress = (answeredCount / TOTAL_QUESTIONS) * 100;







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

    








  useEffect(() => {
    const storedIslandId = localStorage.getItem("selected_island_id");
    if (!storedIslandId) {
      router.push(`/${locale}/island-picker`);
      return;
    }

    const fetchIsland = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/islands?locale=${locale}`);
        if (!res.ok) throw new Error("Failed to fetch islands");
        const data: Island[] = await res.json();
        const selected = data.find((i) => i.id === Number(storedIslandId));
        if (!selected) throw new Error("Selected island not found");
        setIsland(selected);
      } catch (err) {
        console.error(err);
        router.push(`/${locale}/island-picker`);
      } finally {
        setLoading(false);
      }
    };

    fetchIsland();
  }, [locale, router]);

  // ✅ Fetch user progress
  useEffect(() => {
    const fetchProgress = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      try {
        const res = await fetch(`/api/journey/answer?user_id=${userId}`);
        const data = await res.json();
        if (data.success) setAnsweredCount(data.answered_count);
      } catch (err) {
        console.error("❌ Failed to fetch user progress:", err);
      }
    };
    fetchProgress();
  }, []);

  if (loading || !island) return null;

  const assessmentButtonText =
    answeredCount === 0 ? "Start AI Assessment" : "View Your Assessment";

  return (
    <AuthGuard>
     <main className={`min-h-screen ${bgClass} text-gray-100 flex flex-col transition-all duration-500`}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-3 sm:px-6 py-3 sm:py-5 border-b border-white/10 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-center text-xl sm:text-3xl font-bold truncate">
            {island.name}
          </h1>
          <div className="w-8" />
        </div>

        {/* Island icon */}
        <div className="flex justify-center mt-6 sm:mt-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-6xl sm:text-[10rem] animate-bounce"
          >
            {island.icon}
          </motion.div>
        </div>

        {/* Island description */}
        <div className="max-w-xl sm:max-w-3xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            {island.description}
          </p>
        </div>

        {/* AI Assessment Section */}
        <section className="max-w-xl sm:max-w-3xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10 space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-2xl font-semibold text-white text-center">
            {t("header")}
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gray-800/40 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 text-gray-200 shadow-lg"
          >
            <div>
              <h3 className="font-semibold text-sm sm:text-lg text-pink-400">
                {t("why")}
              </h3>
              <p className="mt-1 text-gray-300 text-xs sm:text-sm leading-snug">
                {t("whyText")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm sm:text-lg text-pink-400">
                {t("analysis")}
              </h3>
              <p className="mt-1 text-gray-300 text-xs sm:text-sm leading-snug">
                {t("analysisText")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm sm:text-lg text-pink-400">
                {t("matches")}
              </h3>
              <p className="mt-1 text-gray-300 text-xs sm:text-sm leading-snug">
                {t("matchesText")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center mt-3 gap-1 sm:gap-2 text-gray-400 text-xs sm:text-sm">
              <span className="text-lg sm:text-xl">⏱️</span>
              <p className="text-center">{t("duration")}</p>
            </div>

            {/* Assessment Button */}
            <button
                onClick={() => router.push(`/${locale}/ai-assessment`)}
                className="w-full py-2.5 sm:py-3 mt-3 sm:mt-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold transition shadow-lg text-sm sm:text-lg"
              >
                {assessmentButtonText}
              </button>

              {/* Switch Island Button */}
              <button
                onClick={() => router.push(`/${locale}/island-picker`)}
                className="w-full py-2.5 sm:py-3 mt-2 sm:mt-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition shadow-lg text-sm sm:text-lg"
              >
                Switch Island
              </button>

              {/* Show Find Match if progress >= 50% */}
              {progress >= 50 && (
                <button
                  onClick={() => router.push(`/${locale}/finding-match`)}
                  className="w-full py-2.5 sm:py-3 mt-2 sm:mt-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition shadow-lg text-sm sm:text-lg"
                >
                  Find Match
                </button>
              )}
          </motion.div>
        </section>
      </main>
    </AuthGuard>
  );
}
