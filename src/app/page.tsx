"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

type Lang = "en" | "de" | "zh";

const translations: Record<Lang, { subtitle: string; choose: string; continue: string }> = {
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
    <main className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden text-center px-6 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-600">
      {/* Logo + Title */}
      <div className="flex flex-col sm:flex-row items-center justify-center mb-8">
        
        {/* Animated Logo */}
       {/* Animated Logo */}
<div className="w-24 h-24 flex items-center justify-center bg-white/10 rounded-2xl backdrop-blur-sm shadow-lg mr-4">
  <motion.svg width="60" height="60" viewBox="0 0 60 60">
    {/* Rotating ring ellipses */}
    <motion.ellipse
      cx="30"
      cy="30"
      rx="20"
      ry="15"
      fill="none"
      stroke="#FF8C00"
      strokeWidth="3"
      transform="rotate(-20 30 30)"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
    />
    <motion.ellipse
      cx="30"
      cy="30"
      rx="20"
      ry="15"
      fill="none"
      stroke="#FF8C00"
      strokeWidth="3"
      transform="rotate(20 30 30)"
      animate={{ rotate: -360 }}
      transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
    />
    {/* Two small hearts side by side */}
    <motion.path
      d="M15 20c-1.5-3-6-3-6 0 0 3 6 7 6 7s6-4 6-7c0-3-4.5-3-6 0z"
      fill="#DC2626"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    />
    <motion.path
      d="M35 20c-1.5-3-6-3-6 0 0 3 6 7 6 7s6-4 6-7c0-3-4.5-3-6 0z"
      fill="#DC2626"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    />
  </motion.svg>
</div>

        {/* Title & Subtitle */}
        <div className="text-center sm:text-left mt-4 sm:mt-0">
          <h1 className="text-5xl font-extrabold text-white">SoulSync AI</h1>
          <p className="text-orange-400 text-lg mt-2">{translations[selectedLang].subtitle}</p>
        </div>
      </div>

      {/* Choose Language */}
      <p className="text-white text-md mb-5">{translations[selectedLang].choose}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-8">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={`relative bg-white/10 shadow-md rounded-2xl p-6 hover:shadow-xl transition border-2 ${
              selectedLang === lang.code ? "border-orange-500" : "border-transparent"
            } text-white text-left`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{lang.name}</h2>
                <p className="text-sm text-white/70">{lang.description}</p>
              </div>
              {selectedLang === lang.code && (
                <CheckCircle className="text-orange-500 w-6 h-6" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selectedLang}
        className="w-full max-w-md bg-orange-500 text-white py-4 rounded-2xl shadow-md hover:bg-orange-600 transition disabled:opacity-50"
      >
        {translations[selectedLang].continue}
      </button>
    </main>
  );
}
