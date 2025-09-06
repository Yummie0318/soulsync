"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { Search, User, Calendar, Heart, MapPin, Quote,Camera } from "lucide-react";

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
  const [selected, setSelected] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
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
  const [photo, setPhoto] = useState<string | null>(null); // ✅ added photo state

  // --- Photo upload handler ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Fetch data with loading and error ---
  const {
    data: interestsData,
    error: interestsError,
    isLoading: interestsLoading,
  } = useSWR<Interest[]>("/api/interests", fetcher);

  const {
    data: gendersData,
    error: gendersError,
    isLoading: gendersLoading,
  } = useSWR<Gender[]>("/api/genders", fetcher);

  const {
    data: lookingForData,
    error: lookingForError,
    isLoading: lookingForLoading,
  } = useSWR<LookingFor[]>("/api/lookingfor", fetcher);

  const {
    data: zodiacData,
    error: zodiacError,
    isLoading: zodiacLoading,
  } = useSWR<Zodiac[]>("/api/zodiacs", fetcher);

  const {
    data: countriesData,
    error: countriesError,
    isLoading: countriesLoading,
  } = useSWR<Country[]>("/api/countries", fetcher);

  const interests: Interest[] = interestsData ?? [];
  const genderOptions: Gender[] = gendersData ?? [];
  const lookingForOptions: LookingFor[] = lookingForData ?? [];
  const starSigns: Zodiac[] = zodiacData ?? [];
  const countries: Country[] = countriesData ?? [];

  // --- Toggle functions ---
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
  const handleNext = async () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // ✅ Final step -> Save to database
      const userId = localStorage.getItem("user_id");
  
      if (!userId) {
        alert("No user_id found. Please register again.");
        return;
      }
  
      try {
        const res = await fetch("/api/interest-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: Number(userId),
            interests: selected, // array of interest ids
          }),
        });
  
        const data = await res.json();
  
        if (res.ok) {
          console.log("✅ Interests saved successfully!", data);
          alert("Profile setup complete!");
          // redirect to dashboard or home page
          // router.push("/dashboard");
        } else {
          console.error("❌ Failed to save interests:", data.error);
          alert("Failed to save interests. Please try again.");
        }
      } catch (error) {
        console.error("⚠️ Error saving interests:", error);
        alert("Something went wrong.");
      }
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
            Complete Your Profile
          </h1>
          <p className="text-white/70 mt-2">Let&apos;s set up your profile...</p>

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
            Step {currentStep} of 5
          </p>
        </motion.div>

      {/* ✅ Step 1: Interests */}
{currentStep === 1 && (
  <>
    <div className="flex justify-center mb-4">
      <Search size={40} className="text-pink-400" />
    </div>
    <h2 className="text-lg font-semibold mb-2">
       Your Interests
    </h2>
    <p className="text-center text-sm text-white/70 mb-4">
    Select at least 3 interests to help us find great matches
    </p>
    <p className="text-sm text-pink-400 mb-4">
      {selected.length} / 3 minimum
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
      Failed to load interests. Please try again.
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
      Your Age <span className="text-pink-400">*</span>
    </h2>
    <p className="text-center text-sm text-white/70 mb-4">
      Tell us your birth year (month and day are optional)
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
        placeholder="YYYY"
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
        placeholder="MM"
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
        placeholder="DD"
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
          <h2 className="text-lg font-semibold mb-2">About You</h2>
          <p className="text-sm text-white/70 mb-6">
            Help us find the right matches for you
          </p>

          {/* Gender */}
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-white mb-1">
              Gender <span className="text-pink-400">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="" className="bg-gray-800 text-gray-300">
                Select your gender
              </option>
              {gendersLoading && <option>Loading...</option>}
              {gendersError && <option>Error loading genders</option>}
              {genderOptions.map((opt) => (
                <option
                  key={opt.id}
                  value={opt.id}
                  className="bg-gray-800 text-gray-300"
                >
                  {opt.gender}
                </option>
              ))}
            </select>
          </div>

     {/* Looking For */}
<div className="mb-4 text-left">
  <label className="block text-sm font-medium text-white mb-2">
    Looking for <span className="text-pink-400">*</span>
    <p className="text-xs text-white/60">Select all that apply</p>
  </label>
  <div className="grid grid-cols-2 gap-3">
    {lookingForLoading && (
      <p className="col-span-full text-sm text-gray-400">Loading...</p>
    )}
    {lookingForError && (
      <p className="col-span-full text-sm text-red-400">Error loading options</p>
    )}
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
        <span>{option.items}</span> {/* ✅ use items column */}
      </label>
    ))}
  </div>
</div>


          {/* Star Sign */}
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-white mb-1">
              Star Sign <span className="text-white/60">(Optional)</span>
            </label>
            <select
              value={starSign}
              onChange={(e) => setStarSign(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="" className="bg-gray-800 text-gray-300">
                Select your star sign
              </option>
              {zodiacLoading && <option>Loading...</option>}
              {zodiacError && <option>Error loading star signs</option>}
              {starSigns.map((sign) => (
                <option
                  key={sign.id}
                  value={sign.id}
                  className="bg-gray-800 text-gray-300"
                >
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

    <h2 className="text-lg font-semibold mb-1">Enter your location</h2>
    <p className="text-sm text-white/70 mb-4">
      This helps us provide better date suggestions with real venues
    </p>

    {/* Country Dropdown */}
    <div className="mb-4 text-left">
      <label className="block text-sm font-medium text-white mb-1">
        Country <span className="text-pink-400">*</span>
      </label>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        <option value="" className="bg-gray-800 text-gray-300">
          Select your country
        </option>
        {!countries.length && <option>Loading...</option>}
        {countries.map((c) => (
          <option
            key={c.id}
            value={c.id}
            className="bg-gray-800 text-gray-300"
          >
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
      placeholder="City"
    />

    {/* Postal Code Input */}
    <div className="mb-2">
      <input
        type="text"
        value={postalCode}
        onChange={(e) => {
          let val = e.target.value;
          // Allow empty input
          if (val === "") {
            setPostalCode("");
            return;
          }
          // Limit length to 10
          if (val.length > 10) val = val.slice(0, 10);
          setPostalCode(val);
        }}
        className={`w-full px-4 py-2 rounded-xl border ${
          postalCode.length > 0 && (postalCode.length < 3 || postalCode.length > 10)
            ? "border-red-500"
            : "border-white/20"
        } bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500`}
        placeholder="Postal Code (required)"
      />
      {postalCode.length > 0 && (postalCode.length < 3 || postalCode.length > 10) && (
        <p className="text-xs text-red-400 mt-1">
          Postal Code must be between 3 and 10 characters
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

    <h2 className="text-lg font-semibold mb-1">Finishing Touches</h2>
    <p className="text-sm text-white/70 mb-4">
      Add a profile photo and your favorite quote (optional)
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
        {/* Camera overlay */}

      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handlePhotoUpload(e)}
        className="hidden"
        id="photoUpload"
      />
      <label
        htmlFor="photoUpload"
        className="cursor-pointer px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition"
      >
        Upload Photo
      </label>
    </div>

    {/* Favorite Quote Input */}
    <div className="text-left">
      <label className="block text-sm font-medium text-white mb-1">
        Favorite Quote <span className="text-white/50">(optional)</span>
      </label>
      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        maxLength={200}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
        placeholder="Share a quote that inspires you..."
      />
      <p className="text-xs text-white/50 mt-1">{quote.length}/200</p>
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
    Previous
  </button>

  <button
    onClick={handleNext}
    className={`px-6 py-2 rounded-xl font-semibold transition ${
      // Step 1: interests < 3
      (currentStep === 1 && selected.length < 3) ||
      // Step 2: year not 4 digits
      (currentStep === 2 && age.year.length !== 4) ||
      // Step 3: required not filled
      (currentStep === 3 && (gender === "" || lookingFor.length === 0)) ||
      // Step 4: required country or postal code invalid
      (currentStep === 4 &&
        (country === "" || postalCode.length < 3 || postalCode.length > 10))
        ? "bg-gray-600 text-white/50 cursor-not-allowed"
        : "bg-pink-500 hover:bg-pink-600 text-white"
    }`}
    disabled={
      (currentStep === 1 && selected.length < 3) ||
      (currentStep === 2 && age.year.length !== 4) ||
      (currentStep === 3 && (gender === "" || lookingFor.length === 0)) ||
      (currentStep === 4 &&
        (country === "" || postalCode.length < 3 || postalCode.length > 10))
    }
  >
    {currentStep < 5 ? "Next" : "Finish"}
  </button>
</div>



      </div>
    </main>
  );
}
