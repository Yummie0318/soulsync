"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Heart, Star, Zap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import LogoAnimation from "../animation/LogoAnimation";

export default function LandingPage() {
  const t = useTranslations("LandingPage");
  const { locale } = useParams() as { locale: string };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 overflow-hidden px-6">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Hero Card */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-10 border border-white/20">
        {/* Left: Text + CTA */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6"
        >
          <LogoAnimation />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {t("welcome")}
          </h1>
          <p className="text-lg md:text-xl font-medium text-pink-400">
            {t("tagline")}
          </p>
          <p className="max-w-md text-gray-400">{t("subtitle")}</p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href={`/${locale}/register`}
              className="w-full sm:w-48 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-lg transition text-center"
            >
              {t("getStarted")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="w-full sm:w-48 py-3 rounded-lg border-2 border-white/30 text-white font-semibold shadow-lg hover:bg-pink-500/20 transition text-center"
            >
              {t("login")}
            </Link>
          </div>
        </motion.div>

        {/* Right: Hero Image */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 mt-10 lg:mt-0 flex justify-center"
        >
          <Image
            src="/soulpic.png"
            alt="SoulSync Hero"
            width={500}
            height={400}
            className="rounded-2xl shadow-2xl border border-pink-500/40"
            priority
          />
        </motion.div>
      </div>

      {/* Features */}
      <section className="mt-16 max-w-5xl w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: Zap, color: "text-yellow-400", text: "feature1" },
          { icon: Heart, color: "text-pink-400", text: "feature2" },
          { icon: Star, color: "text-blue-400", text: "feature3" },
        ].map(({ icon: Icon, color, text }, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: idx * 0.2 }}
            className="p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg flex flex-col items-center text-center space-y-3"
          >
            <Icon className={`w-8 h-8 ${color}`} />
            <p className="text-base font-semibold text-gray-200">
              {t(text)}
            </p>
          </motion.div>
        ))}
      </section>
    </main>
  );
}
