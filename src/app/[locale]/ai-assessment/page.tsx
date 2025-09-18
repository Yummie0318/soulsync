"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface Question {
  id: number;
  text: string;
  choices: string[];
}

export default function AiAssessmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getUserId = () => {
    const id = localStorage.getItem("user_id");
    return id ? Number(id) : null;
  };

  // Fetch all questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch("/api/ai/questions");
        if (!res.ok) throw new Error("Failed to load questions");
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setCurrentQuestion(data.questions[0]);
          setProgress(1);
        } else {
          alert("⚠️ No questions found.");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("❌ Failed to load questions:", message);
        alert("⚠️ Failed to load questions. " + message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleNext = async () => {
    if (!selectedAnswer) {
      alert("⚠️ Please select an answer before continuing.");
      return;
    }

    const userId = getUserId();
    if (!userId) {
      alert("❌ User not logged in. Please log in first.");
      router.push(`/${locale}/login`);
      return;
    }

    try {
      setSaving(true);

      // Save answer
      const saveRes = await fetch("/api/ai/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          question_text: currentQuestion?.text,
          answer_text: selectedAnswer,
        }),
      });

      if (!saveRes.ok) {
        let errData: { error?: string } = {};
        try {
          errData = await saveRes.json();
        } catch {}
        console.error("❌ Error saving answer:", errData);
        alert("❌ Error: " + (errData.error || "Failed to save answer"));
        return; // Do NOT move progress if saving failed
      }

      // Only move progress if saving succeeded
      const currentIndex = questions.findIndex(q => q.id === currentQuestion?.id);
      if (currentIndex >= 0 && currentIndex < questions.length - 1) {
        const nextQ = questions[currentIndex + 1];
        setCurrentQuestion(nextQ);
        setSelectedAnswer(null);
        setProgress(currentIndex + 2);
      } else {
        router.push(`/${locale}/assessment-result`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ Unexpected error in handleNext:", message);
      alert("⚠️ Something went wrong: " + message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-300">
        <p className="animate-pulse">Loading AI assessment...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10">
        <div className="flex items-center mb-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-center text-xl sm:text-2xl font-bold">
            AI Assessment
          </h1>
          <div className="w-8" />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700/40 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(progress / questions.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-3 bg-pink-500"
          />
        </div>
        <p className="text-right text-sm text-gray-400 mt-1">
          {Math.round((progress / questions.length) * 100)}% Completed
        </p>
      </div>

      {/* Question */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-8 flex-1">
        {currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gray-800/40 rounded-2xl p-6 shadow-lg space-y-4"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-pink-400">
              {currentQuestion.text}
            </h3>

            <div className="space-y-3">
              {currentQuestion.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAnswer(choice)}
                  className={`w-full py-2 px-4 rounded-xl text-left transition ${
                    selectedAnswer === choice
                      ? "bg-pink-600 text-white font-semibold"
                      : "bg-white/5 hover:bg-white/10 text-gray-200"
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <p className="text-center text-gray-400 animate-pulse">
            Loading next question...
          </p>
        )}
      </section>

      {/* Next Button */}
      {currentQuestion && (
        <div className="max-w-3xl mx-auto w-full px-6 pb-10">
          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 text-white font-semibold text-lg shadow-lg transition"
          >
            {saving ? "Saving..." : "Next Question"}
          </button>
        </div>
      )}
    </main>
  );
}
