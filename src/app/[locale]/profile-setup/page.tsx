"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, User, Heart, MapPin, Quote } from "lucide-react"; // 👈 Added icons
import { useTranslations } from "next-intl";

interface Interest {
  id: number;
  interest: string;
}

export default function ProfileSetupPage() {
  const t = useTranslations("ProfileSetup");

  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state for steps
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await fetch(`/api/interests`);
        const data = await res.json();
        if (Array.isArray(data)) setInterests(data);
      } catch (err: unknown) {
        console.error("Failed to fetch interests:", err);
      }
    };
    fetchInterests();
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step → save everything
      console.log("Saving to database...", {
        interests: selected,
        age,
        gender,
        location,
        quote,
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Glow background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          {/* Title + Subtitle */}
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            Complete Your Profile
          </h1>
          <p className="text-white/70 mt-2">
            Let's set up your profile so you can find amazing matches!
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-3 mt-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? "bg-pink-500" : "bg-gray-400/40"
                }`}
              />
            ))}
          </div>

          {/* Step number */}
          <p className="text-sm text-pink-400 mt-3">
            Step {currentStep} of 5
          </p>
        </motion.div>

        {/* Step Content */}
        {currentStep === 1 && (
          <>
            <div className="flex justify-center mb-4">
              <Search size={40} className="text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              Select at least 3 interests to help us find great matches
            </h2>
            <p className="text-sm text-pink-400 mb-4">
              {selected.length} / 3 minimum
            </p>

            {/* Interest grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {interests.length > 0 ? (
                interests.map((item) => {
                  const isSelected = selected.includes(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleSelect(item.id)}
                      className={`px-3 py-2 rounded-xl border transition-all duration-200 shadow-md text-sm font-medium ${
                        isSelected
                          ? "bg-pink-500/80 text-white border-pink-400 shadow-pink-500/40"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      {item.interest}
                    </motion.button>
                  );
                })
              ) : (
                <p className="col-span-full text-gray-400 text-sm">
                  🔄 Loading interests, please wait...
                </p>
              )}
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="flex justify-center mb-4">
              <User size={40} className="text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Enter your age</h2>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Your age"
            />
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="flex justify-center mb-4">
              <Heart size={40} className="text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Enter your gender</h2>
            <input
              type="text"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Your gender"
            />
          </>
        )}

        {currentStep === 4 && (
          <>
            <div className="flex justify-center mb-4">
              <MapPin size={40} className="text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Enter your location</h2>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Your location"
            />
          </>
        )}

        {currentStep === 5 && (
          <>
            <div className="flex justify-center mb-4">
              <Quote size={40} className="text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Enter your quote</h2>
            <input
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Your favorite quote"
            />
          </>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            className={`px-6 py-2 rounded-xl font-semibold transition ${
              currentStep === 1
                ? "bg-gray-600 text-white/50 cursor-not-allowed"
                : "bg-gray-500 hover:bg-gray-600 text-white"
            }`}
            disabled={currentStep === 1}
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            className={`px-6 py-2 rounded-xl font-semibold transition ${
              currentStep === 1 && selected.length < 3
                ? "bg-gray-600 text-white/50 cursor-not-allowed"
                : "bg-pink-500 hover:bg-pink-600 text-white"
            }`}
            disabled={currentStep === 1 && selected.length < 3}
          >
            {currentStep < 5 ? "Next" : "Finish"}
          </button>
        </div>
      </div>
    </main>
  );
}
