"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, User, Calendar, Heart, MapPin, Quote, Camera } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useNotification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// --- Types for API results ---
interface Interest {
  id: number;
  interest: string;
}
interface Gender {
  id: number;
  gender: string;
}
interface LookingFor {
  id: number;
  items: string;
}
interface Zodiac {
  id: number;
  zodiac: string;
}
interface Country {
  id: number;
  country: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProfileSetupPage() {
  const locale = useLocale();
  const t = useTranslations("ProfileSetup");
  const { showNotification } = useNotification(); // ✅ add this


  const [selected, setSelected] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // --- Photo upload state ---
  const [photoFile, setPhotoFile] = useState<File | null>(null); // raw file
  const [photo, setPhoto] = useState<string | null>(null); // preview

  // --- Form state ---
  const [age, setAge] = useState({ year: "", month: "", day: "" });
  const [quote, setQuote] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [starSign, setStarSign] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // --- Fetch interests (localized) ---
  const {
    data: interests = [],
    error: interestsError,
    isLoading: interestsLoading,
  } = useSWR<Interest[]>(`/api/interests?locale=${locale}`, fetcher);

 // --- Fetch genders (localized) ---
const {
  data: gendersData = [],
  error: gendersError,
  isLoading: gendersLoading,
} = useSWR<Gender[]>(`/api/genders?locale=${locale}`, fetcher);

// --- Fetch lookingFor (localized) ---
const {
  data: lookingForData = [],
  error: lookingForError,
  isLoading: lookingForLoading,
} = useSWR<LookingFor[]>(`/api/lookingfor?locale=${locale}`, fetcher);

// --- Fetch zodiacs (localized) ---
const {
  data: zodiacData = [],
  error: zodiacError,
  isLoading: zodiacLoading,
} = useSWR<Zodiac[]>(`/api/zodiacs?locale=${locale}`, fetcher);

const {
  data: countriesData = [],
  error: countriesError,
  isLoading: countriesLoading,
} = useSWR<Country[]>(`/api/countries?locale=${locale}`, fetcher);

  // --- Normalize data ---
  const genderOptions: Gender[] = gendersData ?? [];
  const lookingForOptions: LookingFor[] = lookingForData ?? [];
  const starSigns: Zodiac[] = zodiacData ?? [];
  const countries: Country[] = countriesData ?? [];

  // --- Handlers ---
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhoto(URL.createObjectURL(file)); // preview
      console.log("📸 Selected file:", file.name, file.size, "bytes");
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleLookingFor = (id: string) => {
    setLookingFor((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  
// --- Navigation ---
const [loading, setLoading] = useState(false); // ✅ add loading state
const router = useRouter(); // ✅ add router for navigation

const handleNext = async () => {
  if (loading) return; // prevent multiple clicks
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    showNotification(t("noUserId"));
    return;
  }

  // If not final step, just move to next
  if (currentStep < 5) {
    setCurrentStep((prev) => prev + 1);
    return;
  }

  // ✅ Step 5: Final submission
  setLoading(true);

  try {
    const formData = new FormData();
    formData.append("user_id", userId);

    // Step 2: Birthdate
    formData.append("year", String(age.year || ""));
    formData.append("month", String(age.month || ""));
    formData.append("day", String(age.day || ""));

    // Step 3: Gender & Zodiac
    formData.append("gender_id", String(gender || ""));
    formData.append("zodiac_id", starSign ? String(starSign) : "");

    // Step 3: Looking For & Interests
    lookingFor.forEach((lf) => formData.append("lookingfor[]", String(lf)));
    selected.forEach((int) => formData.append("interests[]", String(int)));

    // Step 4: Location
    formData.append("country_id", String(country || ""));
    formData.append("city", city || "");
    formData.append("postal", postalCode || "");

    // Step 5: Photo & Quote
    if (photoFile) formData.append("photo", photoFile);
    if (quote) formData.append("quote", quote);

    const res = await fetch("/api/profile-setup", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Combine both messages
      showNotification(`${t("profileSetupComplete")} ${t("profileSetupWelcome")}`);
      console.log("✅ Profile setup completed:", data);
    
      // Redirect after a short delay to let users read the message
      setTimeout(() => {
        router.push(`/${locale}/my-room`);
      }, 1500); // 1.5 seconds delay
    } else {
      console.error("❌ Failed:", data.error);
      showNotification(data.error || t("somethingWentWrong"));
    }
    
  } catch (err) {
    console.error("⚠️ Error saving profile setup:", err);
    showNotification(t("serverError"));
  } finally {
    setLoading(false); // reset loading
  }
};







  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };


  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Background glow */}
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
  <h1 className="text-2xl font-bold text-white drop-shadow-md">
    {t("completeProfile")}
  </h1>
  <p className="text-white/70 mt-2">{t("setupSubtitle")}</p>

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

  <p className="text-sm text-pink-400 mt-3">
    {t("step", { current: currentStep, total: 5 })}
  </p>
</motion.div>


  {/* ✅ Step 1: Interests */}
  {currentStep === 1 && (
        <>
          <div className="flex justify-center mb-4">
            <Search size={40} className="text-pink-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {t("yourInterests")}
          </h2>
          <p className="text-center text-sm text-white/70 mb-4">
            {t("interestsSubtitle")}
          </p>
          <p className="text-sm text-pink-400 mb-4">
            {selected.length} / 3 {t("minimum")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {interestsLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-white/20 rounded-xl animate-pulse"
                />
              ))
            ) : interestsError ? (
              <p className="col-span-full text-red-400 text-sm">
                {t("interestsError")}
              </p>
            ) : (
              interests.map((item: Interest) => {
                const isSelected = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`px-3 py-2 rounded-xl border transition-all duration-150 text-sm font-medium ${
                      isSelected
                        ? "bg-pink-500/80 text-white border-pink-400"
                        : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {item.interest}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}


{/* Step 2: Birthdate */}
{currentStep === 2 && (
  <>
    <div className="flex justify-center mb-4">
      <Calendar size={40} className="text-pink-400" />
    </div>
    <h2 className="text-lg font-semibold mb-1">
      {t("birthdateTitle")} <span className="text-pink-400">*</span>
    </h2>
    <p className="text-center text-sm text-white/70 mb-4">
      {t("birthdateSubtitle")}
    </p>

    <div className="grid grid-cols-3 gap-3">
      {/* Year */}
      <input
        type="number"
        value={age.year}
        onChange={(e) => {
          let rawVal = e.target.value;
          if (rawVal === "") {
            setAge((prev: any) => ({ ...prev, year: "" }));
            return;
          }
          if (rawVal.length > 4) rawVal = rawVal.slice(0, 4);
          setAge((prev: any) => ({ ...prev, year: rawVal }));
        }}
        onBlur={(e) => {
          let rawVal = e.target.value;
          if (rawVal === "") return;

          let yearNum = parseInt(rawVal);
          const currentYear = new Date().getFullYear();
          const minYear = 1900;

          if (yearNum > currentYear) yearNum = currentYear;
          if (yearNum < minYear) yearNum = minYear;

          setAge((prev: any) => ({ ...prev, year: yearNum.toString() }));
        }}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        placeholder={t("yearPlaceholder")}
      />

      {/* Month */}
      <input
        type="number"
        value={age.month}
        onChange={(e) => {
          let val = parseInt(e.target.value) || 0;
          if (val > 12) val = 12;
          if (val < 1 && e.target.value !== "") val = 1;
          setAge((prev: any) => ({ ...prev, month: val.toString() }));
        }}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        placeholder={t("monthPlaceholder")}
      />

      {/* Day */}
      <input
        type="number"
        value={age.day}
        onChange={(e) => {
          let val = parseInt(e.target.value) || 0;
          if (val > 31) val = 31;
          if (val < 1 && e.target.value !== "") val = 1;
          setAge((prev: any) => ({ ...prev, day: val.toString() }));
        }}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        placeholder={t("dayPlaceholder")}
      />
    </div>
  </>
)}



{/* ✅ Step 3: About You */}
{currentStep === 3 && (
  <>
    <div className="flex justify-center mb-4">
      <Heart size={40} className="text-pink-400" />
    </div>

    <h2 className="text-lg font-semibold mb-2">
      {t("aboutTitle")}
    </h2>
    <p className="text-sm text-white/70 mb-6">
      {t("aboutSubtitle")}
    </p>

    {/* Gender */}
    <div className="mb-4 text-left">
      <label className="block text-sm font-medium text-white mb-1">
        {t("genderLabel")} <span className="text-pink-400">*</span>
      </label>
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        <option value="" className="bg-gray-800 text-gray-300">
          {t("selectGender")}
        </option>
        {gendersLoading && <option>{t("loading")}</option>}
        {gendersError && <option>{t("errorLoading")}</option>}
        {genderOptions.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-gray-800 text-gray-300">
            {opt.gender}
          </option>
        ))}
      </select>
    </div>

    {/* Looking For */}
    <div className="mb-4 text-left">
      <label className="block text-sm font-medium text-white mb-2">
        {t("lookingForLabel")} <span className="text-pink-400">*</span>
        <p className="text-xs text-white/60">{t("lookingForSubtitle")}</p>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {lookingForLoading && <p className="col-span-full text-sm text-gray-400">{t("loading")}</p>}
        {lookingForError && <p className="col-span-full text-sm text-red-400">{t("errorLoading")}</p>}
        {lookingForOptions.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={lookingFor.includes(option.id.toString())}
              onChange={() => toggleLookingFor(option.id.toString())}
              className="accent-pink-500"
            />
            <span>{option.items}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Star Sign */}
    <div className="mb-4 text-left">
      <label className="block text-sm font-medium text-white mb-1">
        {t("starSignLabel")} <span className="text-white/60">({t("optional")})</span>
      </label>
      <select
        value={starSign}
        onChange={(e) => setStarSign(e.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        <option value="" className="bg-gray-800 text-gray-300">
          {t("selectStarSign")}
        </option>
        {zodiacLoading && <option>{t("loading")}</option>}
        {zodiacError && <option>{t("errorLoading")}</option>}
        {starSigns.map((sign) => (
          <option key={sign.id} value={sign.id} className="bg-gray-800 text-gray-300">
            {sign.zodiac}
          </option>
        ))}
      </select>
    </div>
  </>
)}

{/* Step 4: Location */}
{currentStep === 4 && (
  <>
    <div className="flex justify-center mb-4">
      <MapPin size={40} className="text-pink-400" />
    </div>

    <h2 className="text-lg font-semibold mb-1">
      {t("locationTitle")} <span className="text-pink-400">*</span>
    </h2>
    <p className="text-sm text-white/70 mb-4">
      {t("locationSubtitle")}
    </p>

    {/* Country Dropdown */}
    <div className="mb-4 text-left">
      <label className="block text-sm font-medium text-white mb-1">
        {t("countryLabel")} <span className="text-pink-400">*</span>
      </label>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        <option value="" className="bg-gray-800 text-gray-300">
          {t("selectCountry")}
        </option>
        {!countries.length && <option>{t("loading")}</option>}
        {countriesData.map((c) => (
        <option key={c.id} value={c.id} className="bg-gray-800 text-gray-300">
          {c.country}
        </option>
        ))}
      </select>
    </div>

    {/* City Input */}
    <input
      type="text"
      value={city}
      onChange={(e) => setCity(e.target.value)}
      className="w-full px-4 py-2 mb-4 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
      placeholder={t("cityPlaceholder")}
    />

    {/* Postal Code Input */}
    <div className="mb-2">
      <input
        type="text"
        value={postalCode}
        onChange={(e) => {
          let val = e.target.value;
          if (val === "") {
            setPostalCode("");
            return;
          }
          if (val.length > 10) val = val.slice(0, 10);
          setPostalCode(val);
        }}
        className={`w-full px-4 py-2 rounded-xl border ${
          postalCode.length > 0 && (postalCode.length < 3 || postalCode.length > 10)
            ? "border-red-500"
            : "border-white/20"
        } bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500`}
        placeholder={t("postalCodePlaceholder")}
      />
      {postalCode.length > 0 && (postalCode.length < 3 || postalCode.length > 10) && (
        <p className="text-xs text-red-400 mt-1">
          {t("postalCodeError")}
        </p>
      )}
    </div>
  </>
)}




{/* Step 5: Finishing Touches */}
{currentStep === 5 && (
  <>
    <div className="flex justify-center mb-4">
      <Camera size={40} className="text-pink-400" />
    </div>

    <h2 className="text-lg font-semibold mb-1">
      {t("title")}
    </h2>
    <p className="text-sm text-white/70 mb-4">
      {t("subtitle")}
    </p>

    {/* Photo Upload */}
    <div className="flex flex-col items-center mb-6 relative">
      <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-3 overflow-hidden relative">
        {photo ? (
          <img
            src={photo}
            alt="Profile"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <User size={50} className="text-white/50" />
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
        id="photoUpload"
      />
      <label
        htmlFor="photoUpload"
        className="cursor-pointer px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition"
      >
        {t("photoLabel")}
      </label>
    </div>

    {/* Favorite Quote Input */}
    <div className="text-left">
      <label className="block text-sm font-medium text-white mb-1">
        {t("quoteLabel")}{" "}
        <span className="text-white/50">{t("quoteOptional")}</span>
      </label>
      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        maxLength={200}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
        placeholder={t("quotePlaceholder")}
      />
      <p className="text-xs text-white/50 mt-1">
        {t("quoteLimit", { length: quote.length })}
      </p>
    </div>
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
    {t("previous")}
  </button>

  <button
    onClick={handleNext}
    className={`px-6 py-2 rounded-xl font-semibold transition ${
      (currentStep === 1 && selected.length < 3) ||
      (currentStep === 2 && age.year.length !== 4) ||
      (currentStep === 3 && (gender === "" || lookingFor.length === 0)) ||
      (currentStep === 4 && (country === "" || postalCode.length < 3 || postalCode.length > 10))
        ? "bg-gray-600 text-white/50 cursor-not-allowed"
        : "bg-pink-500 hover:bg-pink-600 text-white"
    }`}
    disabled={
      (currentStep === 1 && selected.length < 3) ||
      (currentStep === 2 && age.year.length !== 4) ||
      (currentStep === 3 && (gender === "" || lookingFor.length === 0)) ||
      (currentStep === 4 && (country === "" || postalCode.length < 3 || postalCode.length > 10))
    }
  >
    {currentStep < 5 ? t("next") : t("finish")}
  </button>
</div>




      </div>

      {/* Spinner overlay */}
  <AnimatePresence>
    {loading && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
          className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full"
        />
      </motion.div>
    )}
  </AnimatePresence>
    </main>
  );
}
