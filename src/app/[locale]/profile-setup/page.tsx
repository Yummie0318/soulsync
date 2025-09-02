"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

interface Interest {
  id: number;
  interest: string;
}

export default function ProfileSetupPage() {
  const t = useTranslations("ProfileSetup");
  const { locale } = useParams() as { locale: string };
  const router = useRouter();

  // Mock userId for now
  const userId = 1;

  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await fetch(`/api/interests?locale=${locale}`);
        const data = await res.json();
        if (Array.isArray(data)) setInterests(data);
      } catch (err: unknown) {
        console.error("Failed to fetch interests:", err);
      }
    };
    fetchInterests();
  }, [locale]);

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    if (selected.length < 3) return;
    setLoading(true);

    try {
      const res = await fetch("/api/user/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, interests: selected }),
      });

      if (!res.ok) throw new Error("Failed to update interests");

      router.push(`/${locale}/profile-setup/age`);
    } catch (err: unknown) {
      console.error(err);
      alert("Failed to save your interests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Glow background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            {t("completeProfile")} - Step 1 of 5
          </h1>
          <p className="text-white/70 mt-2">{t("interestsSubtitle")}</p>
          <p className="text-sm text-pink-400 mt-1">
            {selected.length} / 3 {t("minimum")}
          </p>
        </motion.div>

        {/* Interest grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {interests.length > 0 ? (
            interests.map((item) => {
              const isSelected = selected.includes(item.id);
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleSelect(item.id)}
                  className={`px-3 py-2 rounded-xl border transition-all duration-200 shadow-md text-sm font-medium ${
                    isSelected
                      ? "bg-pink-500/80 text-white border-pink-400 shadow-pink-500/40"
                      : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {item.interest}
                </motion.button>
              );
            })
          ) : (
            <p className="col-span-full text-gray-400 text-sm">
              {t("noInterestsFound")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            className="px-4 py-2 rounded-xl bg-gray-700/50 border border-white/20 text-white/80 hover:bg-gray-600/50 transition"
            onClick={() => router.back()}
          >
            {t("previous")}
          </button>
          <button
            className={`px-6 py-2 rounded-xl font-semibold transition ${
              selected.length >= 3
                ? "bg-pink-500 hover:bg-pink-600 text-white"
                : "bg-gray-600 text-white/50 cursor-not-allowed"
            }`}
            disabled={selected.length < 3 || loading}
            onClick={handleNext}
          >
            {t("next")}
          </button>
        </div>
      </div>

      {/* Spinner */}
      <AnimatePresence>
        {loading && (
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
              className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
