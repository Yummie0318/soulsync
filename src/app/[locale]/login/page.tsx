"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import LogoAnimation from "../animation/LogoAnimation"; // ✅ import animation

export default function LoginPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const pathname = usePathname();

  // Extract the current locale from the pathname (/en, /de, /zh, etc.)
  const locale = pathname.split("/")[1] || "en";

  const handleStartJourney = () => {
    router.push(`/${locale}/login/ai-drawing`); // ✅ redirect to ai-drawing page
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6 border border-white/20">
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-6"
        >
          <LogoAnimation /> {/* ✅ Reusable animation */}
          <h1 className="text-3xl font-extrabold text-white">SoulSync AI</h1>
          <p className="text-pink-400 text-sm mt-1">{t("welcomeBack")}</p>
        </motion.div>

        {/* Title */}
        <p className="text-center text-gray-400">{t("signingIn")}</p>

        {/* Form */}
        <form className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm mb-1">{t("email")}</label>
            <input
              type="email"
              placeholder={t("enterEmail")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-1">{t("password")}</label>
            <input
              type="password"
              placeholder={t("enterPassword")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Remember Me + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-400 bg-white/10"
              />
              <span>{t("rememberMe")}</span>
            </label>
            <a href="/forgot-password" className="text-pink-400 hover:underline">
              {t("forgotPassword")}
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-lg transition"
          >
            {t("signIn")}
          </button>
        </form>

        {/* Footer Links */}
        <div className="text-center text-sm">
          <span className="text-gray-400">{t("newToSoulSync")} </span>
          <button
            onClick={handleStartJourney}
            className="text-pink-400 hover:underline"
          >
            {t("startNewJourney")}
          </button>
        </div>
      </div>
    </main>
  );
}
