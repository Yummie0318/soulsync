"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/AuthGuard"; // adjust path if needed


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

  if (loading || !island) return null; // optionally add a loader

  return (
    <AuthGuard>
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col">
      {/* Header with back button */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center text-2xl sm:text-3xl font-bold">
          {island.name}
        </h1>
        <div className="w-8" /> {/* right spacer */}
      </div>

      {/* Island icon */}
      <div className="flex justify-center mt-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-8xl sm:text-[10rem] animate-bounce"
        >
          {island.icon}
        </motion.div>
      </div>

      {/* Island description */}
      <div className="max-w-3xl mx-auto px-4 mt-6 text-center">
        <p className="text-gray-300 text-base sm:text-lg">{island.description}</p>
      </div>

      {/* AI Assessment Section */}
      <section className="max-w-3xl mx-auto px-6 mt-10 space-y-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white text-center">
          {t("header")}
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gray-800/40 rounded-2xl p-6 space-y-5 text-gray-200 shadow-lg"
        >
          <div>
            <h3 className="font-semibold text-lg text-pink-400">{t("why")}</h3>
            <p className="mt-1 text-gray-300">{t("whyText")}</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-pink-400">{t("analysis")}</h3>
            <p className="mt-1 text-gray-300">{t("analysisText")}</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-pink-400">{t("matches")}</h3>
            <p className="mt-1 text-gray-300">{t("matchesText")}</p>
          </div>

          <div className="flex items-center justify-center mt-4 gap-2 text-gray-400 text-sm sm:text-base">
            <span className="text-xl">⏱️</span>
            <p>{t("duration")}</p>
          </div>

          <button
            onClick={() => router.push(`/${locale}/ai-assessment`)}
            className="w-full py-3 sm:py-4 mt-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold transition shadow-lg text-lg"
          >
            {t("button")}
          </button>
        </motion.div>
      </section>
    </main>
    </AuthGuard>
  );
}
