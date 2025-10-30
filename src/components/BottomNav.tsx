"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Compass, Users, House, Sparkles, MessageCircle } from "lucide-react";

export default function BottomNav() {
  const t = useTranslations("BottomNav");
  const { locale } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [loadingIsland, setLoadingIsland] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleIslandClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoadingIsland(true);

    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        router.push(`/${locale}/login`);
        return;
      }

      const res = await fetch(`/api/user-island?user_id=${userId}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("❌ API error:", data.error);
        alert("Failed to fetch your island info.");
        return;
      }

      // Save the island_id to localStorage
      if (data.island_id) {
        localStorage.setItem("selected_island_id", data.island_id.toString());
      } else {
        localStorage.removeItem("selected_island_id");
      }

      // Redirect to the correct page
      const targetUrl = data.island_id
        ? `/${locale}/island-welcome`
        : `/${locale}/island-picker`;

      router.push(targetUrl);
    } catch (err) {
      console.error("❌ Exception checking island:", err);
      alert("Failed to check your island. Try again.");
    } finally {
      setLoadingIsland(false);
    }
  };

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

      {/* Islands Button */}
      <button
        onClick={handleIslandClick}
        className={`flex flex-col lg:flex-row items-center gap-1 transition relative ${
          isActive(`/${locale}/island-picker`) ? "text-pink-300" : "hover:text-pink-300"
        }`}
        disabled={loadingIsland}
      >
        <Users className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="text-xs lg:text-sm">
          {loadingIsland ? "" : t("islands")}
        </span>

        {loadingIsland && (
          <span className="absolute top-0 right-0 w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mt-1 ml-1"></span>
        )}
      </button>

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
