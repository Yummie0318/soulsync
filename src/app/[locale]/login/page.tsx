"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, FormEvent } from "react";
import LogoAnimation from "../animation/LogoAnimation";
import { useNotification } from "@/context/NotificationContext";

export default function LoginPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const pathname = usePathname();
  const { showNotification } = useNotification();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const locale = pathname.split("/")[1] || "en";

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      showNotification(t("fillAllFields"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("📡 Login response:", res.status, data);

      if (res.ok && data.success) {
        // Save user ID
        if (data.user?.id) localStorage.setItem("user_id", data.user.id);

        showNotification(t("loginSuccessful"));

        // ✅ Use backend-provided redirect
        if (data.redirect) {
          router.push(`/${locale}${data.redirect}`);
        } else {
          router.push(`/${locale}/my-room`); // fallback
        }
      } else {
        // Map API error codes to translations
        const errorTranslations: Record<string, string> = {
          USER_NOT_FOUND: t("userNotFound"),
          INVALID_PASSWORD: t("invalidCredentials"),
          MISSING_FIELDS: t("fillAllFields"),
          SERVER_ERROR: t("serverError"),
        };
        showNotification(
          errorTranslations[data.code] ||
            data.message ||
            t("somethingWentWrong")
        );
      }
    } catch (err) {
      console.error("❌ Frontend login error:", err);
      showNotification(t("serverError"));
    } finally {
      setLoading(false);
    }
  };

  const handleStartJourney = () => {
    setLoading(true);
    router.push(`/${locale}/login/ai-drawing`);
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-6"
        >
          <LogoAnimation />
          <h1 className="text-3xl font-extrabold text-white">SoulSync AI</h1>
          <p className="text-pink-400 text-sm mt-1">{t("welcomeBack")}</p>
        </motion.div>

        <p className="text-center text-gray-400">{t("signingIn")}</p>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm mb-1">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("enterEmail")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("enterPassword")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-400 bg-white/10" />
              <span>{t("rememberMe")}</span>
            </label>
            <a href="/forgot-password" className="text-pink-400 hover:underline">
              {t("forgotPassword")}
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-lg transition disabled:opacity-50"
          >
            {loading ? t("pleaseWait") : t("signIn")}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-400">{t("newToSoulSync")} </span>
          <button
            onClick={handleStartJourney}
            disabled={loading}
            className="text-pink-400 hover:underline disabled:opacity-50"
          >
            {t("startNewJourney")}
          </button>
        </div>
      </div>

      {/* Spinner Overlay */}
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
