"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import AuthGuard from "@/components/AuthGuard"; // adjust path if needed

interface Option {
  text: string;
  score: number;
}

interface Question {
  question_text: string;
  trait_key: string;
  why_text?: string; // added optional why_text
  options: Option[];
}


export default function AiAssessmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<Option | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { showNotification } = useNotification();

  const TOTAL_QUESTIONS = 20;
  const TRAIT_KEY = "empathy";

  const getUserId = () => {
    const id = localStorage.getItem("user_id");
    return id ? Number(id) : null;
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







  // ✅ Initialize assessment
  const initializeAssessment = async () => {
    const userId = getUserId();
    if (!userId) {
      alert("❌ User not logged in. Please log in first.");
      router.push(`/${locale}/login`);
      return;
    }

    try {
      const res = await fetch(`/api/journey/answer?user_id=${userId}`);
      const data = await res.json();

      if (data.success && data.answered_count > 0) {
        setHasExistingRecord(true);
        setAnsweredCount(data.answered_count);
        const newProgress = Math.min(
          (data.answered_count / TOTAL_QUESTIONS) * 100,
          100
        );
        setProgress(newProgress);

        if (data.answered_count >= TOTAL_QUESTIONS) {
          setAssessmentStarted(false);
          setInitializing(false);
          setLoading(false);
          return;
        }
      } else {
        setHasExistingRecord(false);
        setAssessmentStarted(true);
        await fetchQuestion(true);
      }
    } catch (err) {
      console.error("❌ [INIT ERROR]:", err);
      alert("Failed to check your journey progress.");
    } finally {
      setInitializing(false);
      setLoading(false);
    }
  };

  // ✅ Fetch new question (first or next)
  const fetchQuestion = async (isFirst = false, retry = 1) => {
    setFetchError(null);
    setStatusMessage(
      isFirst ? "Generating your first question..." : "Generating your next question..."
    );
    try {
      setLoading(true);
      const res = await fetch("/api/journey/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trait_key: TRAIT_KEY }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const q = data.question || data.questions?.[0];
      if (!q) throw new Error("No question returned.");

      setQuestion(q);
      setStatusMessage(null);
    } catch (err) {
      console.error("❌ [FETCH QUESTION ERROR]:", err);
      if (retry > 0) await fetchQuestion(isFirst, retry - 1);
      else setFetchError("Failed to generate question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Restart assessment
  const restartAssessment = async (userId: number) => {
    try {
      setStatusMessage("Restarting your journey...");
      const res = await fetch(`/api/journey/answer?user_id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setAnsweredCount(0);
        setProgress(0);
        setAssessmentStarted(true);
        await fetchQuestion(true);
      } else throw new Error(data.error || "Failed to reset answers");
    } catch (err) {
      console.error("❌ [RESTART ERROR]:", err);
      alert("Failed to restart your assessment.");
    } finally {
      setStatusMessage(null);
    }
  };

  useEffect(() => {
    initializeAssessment();
  }, []);

  // ✅ Save answer and fetch next
  const handleNext = async () => {
    if (!selectedAnswer) {
      showNotification("⚠️ Please select an answer first"); // ✅ notification instead of alert
      return;
    }
  
    const userId = getUserId();
    if (!userId) return;
  
    try {
      setSaving(true);
      setStatusMessage("Saving your journey...");
      const res = await fetch("/api/journey/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          question_text: question?.question_text,
          trait_key: question?.trait_key,
          options: question?.options,
          selected_option: selectedAnswer,
        }),
      });
  
      if (!res.ok) throw new Error(await res.text());
  
      const newCount = answeredCount + 1;
      setAnsweredCount(newCount);
      setProgress(Math.min((newCount / TOTAL_QUESTIONS) * 100, 100));
      setSelectedAnswer(null);
  
      if (newCount >= TOTAL_QUESTIONS) {
        await computeTraitsAndCompatibility(userId);
        showNotification("🎉 You’ve completed your AI Journey!");
      } else {
        await fetchQuestion(false);
      }
    } catch (err) {
      console.error("❌ [SAVE ERROR]:", err);
      showNotification("❌ Failed to save your answer");
    } finally {
      setSaving(false);
      setStatusMessage(null);
    }
  };



  // ✅ Compute traits & compatibility
  const computeTraitsAndCompatibility = async (userId: number) => {
    try {
      setStatusMessage("Finalizing your journey...");
      await fetch("/api/journey/traits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      await fetch("/api/journey/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
    } catch (err) {
      console.error("❌ [FINALIZE ERROR]:", err);
    } finally {
      setStatusMessage(null);
    }
  };

  // 🧠 Ask to continue or restart
  if (!assessmentStarted && hasExistingRecord && !loading && !initializing && progress < 100) {
    const userId = getUserId();
    return (
      <main
      className={`min-h-screen flex flex-col items-center justify-center px-4 ${bgClass} transition-all duration-500`}
    >
        
        <h2 className="text-2xl font-semibold mb-6">Continue your AI Journey?</h2>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setAssessmentStarted(true);
              fetchQuestion(false);
            }}
            className="px-6 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-md"
          >
            Continue Assessment
          </button>
          <button
            onClick={() => userId && restartAssessment(userId)}
            className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold shadow-md"
          >
            Restart Assessment
          </button>
        </div>
      </main>
    );
  }

  // 🌀 Loading or status
  if (statusMessage || loading || saving) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center ${bgClass} text-lg text-center transition-all duration-500`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-pink-400 font-medium">{statusMessage || "Loading..."}</p>
        </motion.div>
      </main>
    );
  }

  // ❌ Error
  if (fetchError) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center ${bgClass} text-center px-4 transition-all duration-500`}>
        <p>{fetchError}</p>
        <button
          onClick={() => fetchQuestion(false)}
          className="mt-4 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold"
        >
          Retry
        </button>
      </main>
    );
  }

  // 🎉 If journey is complete
// 🎉 If journey is complete
if (progress >= 100 || answeredCount >= TOTAL_QUESTIONS) {
  const userId = getUserId();
  return (
    <main className={`min-h-screen flex flex-col items-center justify-center ${bgClass} text-gray-100 px-4 transition-all duration-500`}>
   <div className="text-center space-y-6 w-full max-w-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-pink-400">
          Continue your AI Journey?
        </h2>

        {/* 🌟 Show Find Match button on its own row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 items-center"
        >
          <button
            onClick={() => router.push(`/${locale}/finding-match`)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-md transition transform hover:scale-105"
          >
            🔍 Start Finding Match
          </button>

          {/* ⏭️ Continue and Restart Buttons below Find Match */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
            <button
              onClick={() => {
                setAssessmentStarted(true);
                fetchQuestion(false);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-md transition transform hover:scale-105"
            >
              🚀 Continue Assessment
            </button>
            <button
              onClick={() => userId && restartAssessment(userId)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold shadow-md transition"
            >
              🔁 Restart Assessment
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}


// 🧭 Main assessment UI
return (
  <AuthGuard>
  <main className={`min-h-screen flex flex-col ${bgClass} text-gray-100 transition-all duration-500`}>
    {/* 🔝 Header */}
    <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-lg sm:text-2xl font-bold text-center flex-1">
          AI Assessment
        </h1>

        <div className="w-8" />
      </div>

      {/* 🧮 Progress Section */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs sm:text-sm text-gray-400 font-medium">
          {progress.toFixed(0)}% complete
        </p>
      </div>
      <div className="w-full bg-gray-700/40 rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-3 bg-pink-500"
        />
      </div>
    </div>

    {/* 🧠 Question Section */}
    <section className="max-w-full sm:max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 flex-1">
      {question ? (
        <motion.div
          key={question.question_text}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gray-800/40 rounded-2xl p-4 sm:p-6 shadow-lg space-y-4 sm:space-y-6"
        >
          {/* 🗣️ Question Text */}
          <h3 className="text-base sm:text-xl font-semibold text-pink-400 leading-snug">
            {question.question_text}
          </h3>

          {/* ✅ Options */}
          <div className="space-y-3">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedAnswer(opt)}
                className={`w-full py-3 sm:py-4 px-4 rounded-xl text-left transition text-sm sm:text-base ${
                  selectedAnswer?.text === opt.text
                    ? "bg-pink-600 text-white font-semibold"
                    : "bg-white/5 hover:bg-white/10 text-gray-200"
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>

          {/* 💡 Why We Ask */}
          {question.why_text && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-700/50 rounded-xl border-l-4 border-pink-500">
              <p className="text-xs sm:text-sm text-gray-200 italic">
                💡 Why we ask this: {question.why_text}
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <p className="text-center text-gray-400 animate-pulse text-sm sm:text-base">
          Preparing next question...
        </p>
      )}
    </section>

    {/* ⏭️ Bottom Buttons Section */}
    {question && (
      <div className="max-w-full sm:max-w-3xl mx-auto w-full px-4 sm:px-6 pb-6 sm:pb-10 space-y-3 text-center">
        {/* 🌟 Halfway Message & Find Match */}
        {progress >= 50 && progress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-pink-400 font-medium text-sm sm:text-base mb-2">
              You’ve reached 50% of your journey — you can now start finding your match!
            </p>
            <button
              onClick={() => router.push(`/${locale}/finding-match`)}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition shadow-lg text-sm sm:text-lg"
            >
              Find Match
            </button>
          </motion.div>
        )}

        {/* ⏭️ Save & Next / Finish */}
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full py-3 sm:py-4 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 text-white font-semibold text-base sm:text-lg shadow-lg transition"
        >
          {saving
            ? "Saving..."
            : answeredCount + 1 >= TOTAL_QUESTIONS
            ? "Finish Assessment"
            : "Save & Next"}
        </button>
      </div>
    )}
  </main>
  </AuthGuard>
);



}
