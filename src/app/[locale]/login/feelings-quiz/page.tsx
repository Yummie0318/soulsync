"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function FeelingsQuizPage() {
  const t = useTranslations("FeelingsQuiz");
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const feelings = [
    { emoji: "😊", label: t("happy"), color: "text-yellow-300" },
    { emoji: "😟", label: t("sad"), color: "text-blue-400" },
    { emoji: "😌", label: t("peaceful"), color: "text-green-300" },
    { emoji: "😍", label: t("inLove"), color: "text-pink-400" },
  ];

  const handleSelect = (feeling: string) => {
    console.log("Selected feeling:", feeling, "locale:", locale);
    setLoading(true);
    router.push(`/${locale}/login/journey-begin`); // instant redirect
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Card container */}
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            {t("title")}
          </h1>
          <p className="text-white/70 mt-2">{t("subtitle")}</p>
        </motion.div>

        {/* Image */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-xl overflow-hidden border-2 border-pink-400/50 shadow-lg shadow-pink-500/30 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
            <Image
              src="/images/feeling.png"
              alt="Feelings"
              width={600}
              height={300}
              className="object-cover w-full h-48 sm:h-56 md:h-64 lg:h-72"
              priority
            />
          </div>
        </div>

        {/* Feeling Options */}
        <div className="grid grid-cols-2 gap-4">
          {feelings.map((feeling, idx) => (
            <motion.button
              key={idx}
              onClick={() => handleSelect(feeling.label)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-4 border border-white/20 transition-all duration-200 shadow-lg group min-h-[120px] flex flex-col items-center justify-center hover:border-pink-400/50 hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="text-4xl mb-2">{feeling.emoji}</div>
              <p className="text-white/80 text-sm group-hover:text-white">
                {feeling.label}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Spinner overlay (shows briefly while redirecting) */}
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
