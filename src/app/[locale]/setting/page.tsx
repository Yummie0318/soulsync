"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

const backgrounds = [
  { name: "Default Gradient", class: "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200" },
  { name: "Cool Blue", class: "bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 text-white" },
  { name: "Sunset", class: "bg-gradient-to-br from-red-500 via-yellow-500 to-orange-500 text-white" },
  { name: "Forest", class: "bg-gradient-to-br from-green-900 via-green-700 to-green-500 text-white" },
  { name: "Purple Haze", class: "bg-gradient-to-br from-purple-900 via-purple-700 to-pink-500 text-white" },
];

const languages = [
  { code: "en", label: "EN" },
  { code: "zh", label: "ZH" },
  { code: "de", label: "DE" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [selectedBg, setSelectedBg] = useState(backgrounds[0].class);
  const [saving, setSaving] = useState(false); // disable button while saving
  const [locale, setLocale] = useState("en"); // for URL

  // Load current user background
  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    fetch(`/api/user/background?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.background_classes) {
          setSelectedBg(data.background_classes);
        }
      })
      .catch(err => console.error("Failed to fetch background:", err));
  }, []);

  const handleSelectBg = (bgClass: string) => setSelectedBg(bgClass);

  const handleChangeLocale = (code: string) => {
    setLocale(code);
    const pathname = window.location.pathname.split("/").slice(2).join("/");
    window.history.replaceState(null, "", `/${code}/${pathname}`);
  };

  const handleSave = async () => {
    if (saving) return; // prevent multiple clicks
    const userId = localStorage.getItem("user_id");
    if (!userId) return showNotification("User not logged in");

    setSaving(true);

    try {
      const res = await fetch("/api/user/update-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background_classes: selectedBg, user_id: userId }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification("Settings saved successfully!");
      } else {
        showNotification("Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={`${selectedBg} min-h-screen transition-all duration-500`}>
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-20 px-4 py-4 border-b border-white/10 flex items-center justify-center">
        <button
          onClick={() => router.back()}
          className="absolute left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-200">
          Settings
        </h1>
      </div>

      {/* Content */}
      <div className="p-6 sm:p-10 space-y-8">
        {/* Background Selection */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-200">Choose Your Background</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {backgrounds.map(bg => (
              <div
                key={bg.name}
                className={`cursor-pointer rounded-2xl p-4 sm:p-6 shadow-lg transition-transform transform hover:scale-105 ${bg.class} ${selectedBg === bg.class ? "ring-4 ring-yellow-400" : ""}`}
                onClick={() => handleSelectBg(bg.class)}
              >
                <p className="font-semibold">{bg.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-200">Choose Your Language</h2>
          <div className="flex gap-2 sm:gap-4 flex-wrap">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleChangeLocale(lang.code)}
                className={`px-4 sm:px-5 py-2 rounded-lg font-semibold transition ${
                  locale === lang.code
                    ? "bg-pink-500 text-white shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white shadow-md transition text-center ${
              saving ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
