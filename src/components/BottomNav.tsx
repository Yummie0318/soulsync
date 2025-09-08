"use client";

import { Compass, Users, House, Sparkles, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function BottomNav() {
  const t = useTranslations("BottomNav");

  return (
    <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[95%] max-w-lg md:max-w-4xl lg:max-w-6xl rounded-2xl bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md border border-white/20 flex justify-around items-center py-3 md:py-4 lg:py-5 text-sm lg:text-base text-white shadow-lg">
      <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
        <Compass className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("search")}</span>
      </button>
      <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
        <Users className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("islands")}</span>
      </button>
      <button className="flex flex-col lg:flex-row items-center gap-1 text-pink-300">
        <House className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("myRoom")}</span>
      </button>
      <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
        <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("journey")}</span>
      </button>
      <button className="flex flex-col lg:flex-row items-center gap-1 hover:text-pink-300 transition">
        <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("messages")}</span>
      </button>
    </nav>
  );
}
