"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, FormEvent } from "react";
import Image from "next/image";

export default function RegisterPage() {
  const t = useTranslations("SignUp");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false); // new state
  const [notification, setNotification] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSignIn = () => {
    router.push(`/${locale}/login`);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      showNotification("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      showNotification("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        showNotification("Account created successfully!");
        setAccountCreated(true); // disable the button permanently
        router.push(`/${locale}/profile-setup`);
      } else {
        showNotification(data.error || "Something went wrong!");
      }
    } catch (err) {
      console.error(err);
      showNotification("Server error, try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-medium text-sm tracking-wide"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

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
          <p className="text-pink-400 text-sm mt-2 max-w-sm">{t("subtitle")}</p>
        </motion.div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1">{t("usernameLabel")}</label>
            <input
              type="text"
              placeholder={t("usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t("emailLabel")}</label>
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t("passwordLabel")}</label>
            <input
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t("confirmPasswordLabel")}</label>
            <input
              type="password"
              placeholder={t("confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || accountCreated} // disable after account created
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold shadow-lg transition disabled:opacity-60"
          >
            {loading
              ? "Creating your account..."
              : accountCreated
              ? "Account Created"
              : t("createAccount")}
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
          <button className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center gap-2 transition">
            <Image src="/images/google.png" alt="Google" width={24} height={24} />
            Google
          </button>
          <button className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center gap-2 transition">
            <Image src="/images/apple.png" alt="Apple" width={20} height={20} />
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
