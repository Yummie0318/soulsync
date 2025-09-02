"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";

export default function JourneyBeginPage() {
  const t = useTranslations("JourneyBegin");
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const goSignUp = () => {
    setLoading(true);
    router.push(`/${locale}/login/auth`); // 🚀 instant redirect
  };

  // ✅ Prefetch for instant load
  useEffect(() => {
    router.prefetch(`/${locale}/login/auth`);
  }, [locale, router]);

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 px-4 py-10 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Card */}
      <div className="w-full max-w-xl">
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-white/30 via-white/10 to-white/30 shadow-2xl shadow-black/30">
          <div className="rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 px-6 py-10 sm:px-10 text-center">
            {/* Play icon badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 shadow-[0_12px_40px_rgba(236,72,153,0.35)] flex items-center justify-center mb-6 ring-2 ring-white/40"
            >
              <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md"
            >
              {t("titleLine1")}
              <br className="hidden sm:block" />
              <span className="block">{t("titleLine2")}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 text-sm sm:text-base text-white/80 leading-relaxed"
            >
              {t("subtitle")}
            </motion.p>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={goSignUp}
              disabled={loading}
              className="mt-8 w-full sm:w-3/4 mx-auto rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white font-semibold py-3 shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecting..." : t("cta")}
            </motion.button>
          </div>
        </div>

        {/* Footer prompt */}
        <p className="mt-6 text-center text-xs sm:text-sm text-white/70">
          {t("footerPrompt")}
        </p>
      </div>

      {/* Fade overlay with spinner */}
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
