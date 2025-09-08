"use client";

import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotification } from "@/context/NotificationContext";
import { useTranslations } from "next-intl";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  countries: any[];
  genders: any[];
  ethnicities: any[];
  zodiacs: any[];
  lookingfor: any[];
  onUpdate?: (updatedUser: any) => void; // ✅ already added
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  countries,
  genders,
  ethnicities,
  zodiacs,
  lookingfor,
  onUpdate, // ✅ FIX: destructure it here
}: EditProfileModalProps) {
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    username: "",
    year: "",
    month: "",
    day: "",
    quote: "",
    gender_id: null,
    ethnicity_id: null,
    zodiac_id: null,
    country_id: null,
    city: "",
    postal: "",
    currentcountry_id: null,
    currentcity: "",
    currentpostal: "",
    details_id: 1,
    lookingfor: [] as number[],
  });

  const [locationDetails, setLocationDetails] = useState<{ id: number; details: string }[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const [saving, setSaving] = useState(false); // spinner state

  const t = useTranslations("EditProfileModal"); // spinner state

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        year: user.year || "",
        month: user.month || "",
        day: user.day || "",
        quote: user.quote || "",
        gender_id: user.gender_id || null,
        ethnicity_id: user.ethnicity_id || null,
        zodiac_id: user.zodiac_id || null,
        country_id: user.country_id || null,
        city: user.city || "",
        postal: user.postal || "",
        currentcountry_id: user.currentcountry_id || null,
        currentcity: user.currentcity || "",
        currentpostal: user.currentpostal || "",
        details_id: user.details_id || 1,
        lookingfor: user.lookingfor || [],
      });
    }
  }, [user]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleLookingFor = (id: number) => {
    setFormData((prev) => {
      const updated = prev.lookingfor.includes(id)
        ? prev.lookingfor.filter((x) => x !== id)
        : [...prev.lookingfor, id];
      return { ...prev, lookingfor: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/user/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
  
      if (!res.ok) throw new Error("Failed to update profile");
  
      const updatedUser = await res.json(); // ✅ get updated user from API
  
      // Show notification
      showNotification("Profile updated successfully!");
  
      // ✅ Update parent component
      if (onUpdate) {
        onUpdate(updatedUser);
      }
  
      onClose();
    } catch (err) {
      console.error(err);
      showNotification("❌ Error updating profile");
    } finally {
      setSaving(false);
    }
  };
  

  useEffect(() => {
    fetch("/api/locationdetails")
      .then((res) => res.json())
      .then((data) => {
        setLocationDetails(data);
        setLoadingLocation(false);
      })
      .catch((err) => {
        console.error("Failed to fetch location details:", err);
        setLoadingLocation(false);
      });
  }, []);



  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-900 text-white rounded-2xl shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
          

  {/* Spinner overlay */}
          <AnimatePresence>
            {saving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-2xl"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>


          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <Dialog.Title className="text-lg font-semibold">{t("title")}</Dialog.Title>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Profile Info */}
            <section>
            <h3 className="text-pink-400 text-sm font-semibold mb-2">
              {t("profileInfo")}
            </h3>

              <div className="space-y-3">
                <label className="block">
                <span className="text-sm text-gray-400">{t("username")}</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 mt-1"
                  />
                </label>

                <div>
                <span className="text-sm text-gray-400">{t("dob")}</span>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <input
                      type="number"
                      placeholder="Year"
                      value={formData.year}
                      onChange={(e) => handleChange("year", e.target.value)}
                      className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                    />
                    <input
                      type="number"
                      placeholder="Month"
                      value={formData.month}
                      onChange={(e) => handleChange("month", e.target.value)}
                      className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                    />
                    <input
                      type="number"
                      placeholder="Day"
                      value={formData.day}
                      onChange={(e) => handleChange("day", e.target.value)}
                      className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                    />
                  </div>
                </div>

                <label className="block">
                <span className="text-sm text-gray-400">{t("quote")}</span>
                  <textarea
                    value={formData.quote}
                    onChange={(e) => handleChange("quote", e.target.value)}
                    rows={2}
                    className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 mt-1"
                  />
                </label>
              </div>
            </section>

            <hr className="border-gray-700" />

            {/* Location Details */}
            <section>
            <h3 className="text-pink-400 text-sm font-semibold mb-2">{t("locationDetails")}</h3>

              {/* Radio buttons */}
              {loadingLocation ? (
               <p className="text-sm text-gray-400 mb-3">{t("loading")}</p>
              ) : (
                <div className="flex gap-4 mb-3">
                  {locationDetails.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                     <input
                          type="radio"
                          name="details_id"
                          value={d.id}
                          checked={formData.details_id === d.id}
                          onChange={(e) => handleChange("details_id", Number(e.target.value))}
                          className="accent-pink-500"
                        />
                      <span>{d.details}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Home Location */}
              <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-400">{t("homeLocation")}</p>
                <select
                  value={formData.country_id ?? ""}
                  onChange={(e) => handleChange("country_id", Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value="">-- Select Country --</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.country}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Postal"
                    value={formData.postal}
                    onChange={(e) => handleChange("postal", e.target.value)}
                    className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                  />
                </div>
              </div>

              {/* Current Location */}
              <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-400">
                {t("currentLocation")} <span className="text-gray-500">{t("optional")}</span>
              </p>

                <select
                  value={formData.currentcountry_id ?? ""}
                  onChange={(e) => handleChange("currentcountry_id", Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                 <option value="">{t("selectCountry")}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.country}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t("currentCityPlaceholder")}
                    value={formData.currentcity}
                    onChange={(e) => handleChange("currentcity", e.target.value)}
                    className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                  />
                  <input
                    type="text"
                    placeholder={t("currentPostalPlaceholder")}
                    value={formData.currentpostal}
                    onChange={(e) => handleChange("currentpostal", e.target.value)}
                    className="p-2 rounded-lg bg-gray-800 border border-gray-700"
                  />
                </div>
              </div>
            </section>

            <hr className="border-gray-700" />

            {/* Dating Preferences */}
            <section>
            
            <h3 className="text-pink-400 text-sm font-semibold mb-2">{t("datingPreferences")}</h3>
              <div className="space-y-3">
                <select
                  value={formData.gender_id ?? ""}
                  onChange={(e) => handleChange("gender_id", Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                 <option value="">{t("selectGender")}</option>
                  {genders.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gender}
                    </option>
                  ))}
                </select>

                <select
                  value={formData.ethnicity_id ?? ""}
                  onChange={(e) => handleChange("ethnicity_id", Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                <option value="">{t("selectEthnicity")}</option>
                  {ethnicities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.ethnicity}
                    </option>
                  ))}
                </select>

                <select
                  value={formData.zodiac_id ?? ""}
                  onChange={(e) => handleChange("zodiac_id", Number(e.target.value))}
                  className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value="">{t("selectStarSign")}</option>
                  {zodiacs.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.zodiac}
                    </option>
                  ))}
                </select>

                {/* Looking For */}
                <div className="mb-6 text-left">
                <p className="text-sm font-medium text-gray-400 mb-2">
                  {t("lookingFor")} <span className="text-pink-400">*</span>
                </p>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {lookingfor.length === 0 && (
                      
                  <p className="col-span-full text-sm text-gray-400">{t("loadingOptions")}</p>

                    )}

                    {lookingfor.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 bg-gray-800 text-white/80 hover:bg-gray-700 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={formData.lookingfor.includes(item.id)}
                          onChange={() => toggleLookingFor(item.id)}
                          className="accent-pink-500 w-4 h-4"
                        />
                        <span className="truncate">{item.items}</span>
                      </label>
                    ))}
                  </div>
                </div>



              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition"
          >
            {t("saveChanges")}
          </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>

    
  );
}
