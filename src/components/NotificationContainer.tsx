"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "@/context/NotificationContext";
import { X } from "lucide-react";

export default function NotificationContainer() {
  // ✅ now inside the component (safe)
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 w-full max-w-xs">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm tracking-wide flex justify-between items-center"
          >
            <span>{n.message}</span>
            <button
              onClick={() => removeNotification(n.id)}
              className="ml-3 hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
