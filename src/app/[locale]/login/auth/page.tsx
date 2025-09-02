"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export default function RegisterPage() {
  const t = useTranslations("SignUp");
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const locale = pathname.split("/")[1] || "en";

  const handleSignIn = () => {
    setLoading(true);
    router.push(`/${locale}/login`);
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
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-6 text-center"
        >
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="text-pink-400 text-sm mt-2 max-w-sm">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Form */}
        <form className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm mb-1">{t("usernameLabel")}</label>
            <input
              type="text"
              placeholder={t("usernamePlaceholder")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-1">{t("emailLabel")}</label>
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-1">{t("passwordLabel")}</label>
            <input
              type="password"
              placeholder={t("passwordPlaceholder")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm mb-1">{t("confirmPasswordLabel")}</label>
            <input
              type="password"
              placeholder={t("confirmPasswordPlaceholder")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-lg transition"
          >
            {t("createAccount")}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-2 my-4">
          <div className="flex-grow h-px bg-white/20" />
          <span className="text-xs text-gray-400">{t("orContinueWith")}</span>
          <div className="flex-grow h-px bg-white/20" />
        </div>

    {/* Social Login */}
<div className="flex gap-3">
  {/* Google Button */}
  <button className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center gap-2 transition">
    <Image
      src="/images/google.png" // ✅ local path
      alt="Google"
      width={24}
      height={24}
    />
    Google
  </button>

  {/* Apple Button */}
  <button className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center gap-2 transition">
    <Image
      src="/images/apple.png" // ✅ local path
      alt="Apple"
      width={20}
      height={20}
    />
    Apple
  </button>
</div>


        {/* Footer Links */}
        <div className="text-center text-sm">
          <span className="text-gray-400">{t("alreadyHaveAccount")} </span>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="text-pink-400 hover:underline disabled:opacity-50"
          >
            {t("signIn")}
          </button>
        </div>
      </div>

      {/* Spinner overlay */}
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
