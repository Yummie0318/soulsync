"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

// ✅ Import the logo animation
import LogoAnimation from "./[locale]/animation/LogoAnimation";


type Lang = "en" | "de" | "zh";

const translations: Record<
  Lang,
  { subtitle: string; choose: string; continue: string }
> = {
  en: {
    subtitle: "AI-Powered Dating",
    choose: "Choose your language",
    continue: "Continue",
  },
  de: {
    subtitle: "KI-gestütztes Dating",
    choose: "Wählen Sie Ihre Sprache",
    continue: "Fortfahren",
  },
  zh: {
    subtitle: "人工智能驱动的约会",
    choose: "选择你的语言",
    continue: "继续",
  },
};

export default function HomePage() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<Lang>("en");

  const handleContinue = () => {
    if (selectedLang) {
      router.push(`/${selectedLang}/landing`);
    }
  };

  const languages = [
    { code: "en" as Lang, name: "English", description: "Continue in English" },
    { code: "de" as Lang, name: "Deutsch", description: "Auf Deutsch fortfahren" },
    { code: "zh" as Lang, name: "中文", description: "继续使用中文" },
  ];

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* ✅ Logo Animation + Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-10"
      >
        <LogoAnimation />

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-md">
          SoulSync AI
        </h1>
        <p className="text-pink-400 text-lg sm:text-xl mt-2">
          {translations[selectedLang].subtitle}
        </p>
      </motion.div>

      {/* Choose Language */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/80 text-md sm:text-lg mb-6"
      >
        {translations[selectedLang].choose}
      </motion.p>

      {/* Language Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl w-full mb-10">
        {languages.map((lang, index) => (
          <motion.button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * index }}
            className={`relative bg-white/10 backdrop-blur-lg shadow-lg rounded-2xl p-6 hover:shadow-pink-500/30 hover:border-pink-500/60 transition border-2 ${
              selectedLang === lang.code ? "border-pink-500" : "border-transparent"
            } text-white text-left`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{lang.name}</h2>
                <p className="text-sm text-white/70">{lang.description}</p>
              </div>
              {selectedLang === lang.code && (
                <CheckCircle className="text-pink-500 w-6 h-6 shrink-0" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Continue Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleContinue}
        disabled={!selectedLang}
        className="w-full max-w-md bg-pink-600 text-white py-4 rounded-2xl shadow-lg hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
      >
        {translations[selectedLang].continue}
      </motion.button>
    </main>
  );
}
