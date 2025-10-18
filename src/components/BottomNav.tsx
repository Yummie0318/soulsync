"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { Compass, Users, House, Sparkles, MessageCircle } from "lucide-react";

export default function BottomNav() {
  const t = useTranslations("BottomNav");
  const { locale } = useParams();
  const pathname = usePathname(); // get current path

  // helper to check if link is active
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[95%] max-w-lg md:max-w-4xl lg:max-w-6xl rounded-2xl bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md border border-white/20 flex justify-around items-center py-3 md:py-4 lg:py-5 text-sm lg:text-base text-white shadow-lg">
      
      {/* Search */}
      <Link
        href={`/${locale}/user-search`}
        className={`flex flex-col lg:flex-row items-center gap-1 transition ${
          isActive(`/${locale}/user-search`) ? "text-pink-300" : "hover:text-pink-300"
        }`}
      >
        <Compass className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("search")}</span>
      </Link>

      {/* Islands */}
      <Link
        href={`/${locale}/island-picker`}
        className={`flex flex-col lg:flex-row items-center gap-1 transition ${
          isActive(`/${locale}/island-picker`) ? "text-pink-300" : "hover:text-pink-300"
        }`}
      >
        <Users className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("islands")}</span>
      </Link>

      {/* My Room */}
      <Link
        href={`/${locale}/my-room`}
        className={`flex flex-col lg:flex-row items-center gap-1 transition ${
          isActive(`/${locale}/my-room`) ? "text-pink-300" : "hover:text-pink-300"
        }`}
      >
        <House className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("myRoom")}</span>
      </Link>

      {/* Journey */}
      <Link
        href={`/${locale}/ai-assessment`}
        className={`flex flex-col lg:flex-row items-center gap-1 transition ${
          isActive(`/${locale}/ai-assessment`) ? "text-pink-300" : "hover:text-pink-300"
        }`}
      >
        <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("journey")}</span>
      </Link>

      {/* Messages */}
      <Link
        href={`/${locale}/my-messages`}
        className={`flex flex-col lg:flex-row items-center gap-1 transition ${
          isActive(`/${locale}/my-messages`) ? "text-pink-300" : "hover:text-pink-300"
        }`}
      >
        <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">{t("messages")}</span>
      </Link>
    </nav>
  );
}
