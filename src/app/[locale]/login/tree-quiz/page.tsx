"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export default function TreeQuizPage() {
  const t = useTranslations("TreeQuiz");
  const { locale } = useParams() as { locale: string };
  const router = useRouter();

  const trees = [
    { emoji: "🌲", label: t("optionEvergreen"), color: "text-green-800" },
    { emoji: "🌳", label: t("optionGrounded"), color: "text-green-800" },
    { emoji: "🌴", label: t("optionTropical"), color: "text-green-600" },
    { emoji: "🌸", label: t("optionDelicate"), color: "text-pink-500" },
  ];

  const handleSelect = (tree: string) => {
    console.log("Selected tree:", tree);
    // 👉 redirect to feelings quiz
    router.push(`/${locale}/login/feelings-quiz`);
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
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            {t("chooseYourTree")}
          </h1>
          <p className="text-white/70 mt-2">{t("subtitle")}</p>
        </motion.div>

        {/* Tree Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {trees.map((tree, idx) => (
            <motion.button
              key={idx}
              onClick={() => handleSelect(tree.label)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-4 border border-white/20 transition-all duration-300 shadow-lg group min-h-[140px] flex flex-col items-center justify-center hover:border-pink-400/50 hover:bg-white/20"
            >
              <div className="w-20 h-20 mb-3 flex items-center justify-center rounded-2xl bg-gradient-to-b from-pink-200 to-pink-500 shadow-inner">
                <div className={`text-4xl ${tree.color}`}>{tree.emoji}</div>
              </div>
              <p className="text-white/70 text-sm group-hover:text-white/90">
                {tree.label}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </main>
  );
}
