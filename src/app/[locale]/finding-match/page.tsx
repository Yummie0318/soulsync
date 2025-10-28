"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart, XCircle, ArrowLeft } from "lucide-react";
import AuthGuard from "@/components/AuthGuard"; // adjust path if needed

interface User {
  id: number;
  username: string;
  quote?: string;
  photo_file_path?: string | null;
}

interface Match extends User {
  score: number;
  target_user_id: number;
  id: number;
}

export default function FindingMatchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"island" | "journey" | "match" | null>("island");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId =
    typeof window !== "undefined" ? Number(localStorage.getItem("user_id")) : null;

  const formatPhoto = (path: string | null | undefined) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("/uploads/")) return path;
    return `/uploads/${path}`;
  };





    // BACKGROUND COLOR
    const [bgClass, setBgClass] = useState(
      "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200"
    );
  
    useEffect(() => {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
  
      fetch(`/api/user/background?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.background_classes) {
            setBgClass(data.background_classes);
          }
        })
        .catch(err => console.error("Failed to fetch user background:", err));
    }, []);

    

  const findMatchFlow = async () => {
    if (!userId) {
      router.replace(`/${locale}/login`);
      return;
    }

    setLoading(true);
    setStep("island");
    setError(null);

    try {
      // --- Step 1: Check Island ---
      const islandRes = await fetch(`/api/user-island?user_id=${userId}`);
      const islandData = await islandRes.json();
      if (!islandData.island_id) {
        setError("You don't have an island yet! Redirecting...");
        setTimeout(() => router.replace(`/${locale}/island-picker`), 2500);
        return;
      }
      localStorage.setItem("selected_island_id", islandData.island_id.toString());

      // --- Step 2: Check Journey ---
      setStep("journey");
      const answeredRes = await fetch(`/api/journey/answer?user_id=${userId}`);
      const answeredData = await answeredRes.json();
      if (!answeredData.success || answeredData.answered_count < 10) {
        setError("You need at least 10 answers! Redirecting to AI Assessment...");
        setTimeout(() => router.replace(`/${locale}/ai-assessment`), 2500);
        return;
      }

      // --- Step 3: Fetch Match ---
      setStep("match");
      const traitsRes = await fetch("/api/journey/traits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const traitsData = await traitsRes.json();
      if (!traitsData.success) throw new Error(traitsData.error || "Failed to fetch traits");

      const user = traitsData.user;
      setCurrentUser({
        id: user.id,
        username: user.username || "You",
        quote: user.quote,
        photo_file_path: formatPhoto(user.photo_file_path),
      });

      const bestMatch = traitsData.compatibilities?.[0] || null;
      if (bestMatch) {
        setMatch({
          id: bestMatch.target_user_id,
          target_user_id: bestMatch.target_user_id,
          score: Number(bestMatch.score),
          username: bestMatch.username || "Unknown",
          quote: bestMatch.quote || "",
          photo_file_path: formatPhoto(bestMatch.photo_file_path),
        });
      } else {
        setMatch(null);
      }
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Something went wrong while finding your match.");
    } finally {
      setLoading(false);
      setStep(null);
    }
  };

  useEffect(() => {
    findMatchFlow();
  }, []);

  const percentage = match ? Math.round(match.score * 100) : 0;

  // --- Loader messages per step ---
  const loaderMessage = {
    island: "Checking your island...",
    journey: "Checking your journey...",
    match: "Finding your match...",
  }[step || "match"];

  return (
    <AuthGuard>
    <main className={`min-h-screen flex flex-col ${bgClass} text-gray-100 transition-all duration-500`}>
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-3 sm:px-6 py-3 sm:py-5 border-b border-white/10 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center text-xl sm:text-3xl font-bold truncate text-pink-400">
          Your Best Match
        </h1>
        <div className="w-8" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6">
        {(loading && step) && (
          <>
            <div className="relative mb-6">
              {step === "match" ? (
                <div className="w-16 h-16 flex items-center justify-center">
                  <Heart className="text-pink-400 w-10 h-10 animate-pulse" />
                </div>
              ) : (
                <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className="text-pink-300 text-lg font-medium animate-pulse text-center">
              {loaderMessage}
              <br />
              <span className="text-gray-400 text-sm">Please be patient</span>
            </p>
            <button
              onClick={() => router.push(`/${locale}/my-room`)}
              className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm sm:text-base transition"
            >
              Cancel
            </button>
          </>
        )}

        {!loading && error && (
          <p className="text-red-400 text-lg text-center">{error}</p>
        )}

        {!loading && match && currentUser && (
          <>
            <div className="flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md relative">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-lg border-4 border-pink-500/40 bg-gradient-to-br from-gray-700 to-gray-800">
                {currentUser.photo_file_path ? (
                  <img src={currentUser.photo_file_path} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                    No Photo
                  </div>
                )}
                <span className="absolute bottom-0 inset-x-0 text-center bg-black/60 text-white text-xs py-1">
                  You
                </span>
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="text-pink-500 w-10 h-10 animate-bounce" />
              </div>

              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-lg border-4 border-pink-500/40 bg-gradient-to-br from-gray-700 to-gray-800">
                {match.photo_file_path ? (
                  <img src={match.photo_file_path} alt={match.username || "Match"} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                    No Photo
                  </div>
                )}
                <span className="absolute bottom-0 inset-x-0 text-center bg-black/60 text-white text-xs py-1">
                  {match.username || `User ${match.target_user_id}`}
                </span>
              </div>
            </div>

            <div className="text-center mt-8 animate-fadeInUp">
              <p className="text-3xl font-bold text-pink-400">{percentage}% Match</p>
              <p className="text-gray-400 italic mt-2">
                {match.quote || "Looking for someone to vibe with"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <button
                onClick={() =>
                  router.push(`/${locale}/my-messages/conversation?receiverId=${match.target_user_id}`)
                }
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-sm sm:text-base transition shadow-md"
              >
                Message
              </button>

              <button
                onClick={() => findMatchFlow()}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-sm sm:text-base transition shadow-md"
              >
                Find Match Again
              </button>
            </div>
          </>
        )}
      </div>
    </main>
    </AuthGuard>
  );
}
