"use client";

import { motion } from "framer-motion";

export default function LogoAnimation() {
  return (
    <div className="w-24 h-24 flex items-center justify-center bg-white/10 rounded-2xl backdrop-blur-sm shadow-lg mb-4">
      <motion.svg width="60" height="60" viewBox="0 0 60 60">
        {/* Animated orbits */}
        <motion.ellipse
          cx="30"
          cy="30"
          rx="20"
          ry="15"
          fill="none"
          stroke="#FF4D67"
          strokeWidth="3"
          transform="rotate(-20 30 30)"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        />
        <motion.ellipse
          cx="30"
          cy="30"
          rx="20"
          ry="15"
          fill="none"
          stroke="#FF4D67"
          strokeWidth="3"
          transform="rotate(20 30 30)"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        />
        {/* Animated hearts */}
        <motion.path
          d="M15 20c-1.5-3-6-3-6 0 0 3 6 7 6 7s6-4 6-7c0-3-4.5-3-6 0z"
          fill="#E11D48"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <motion.path
          d="M35 20c-1.5-3-6-3-6 0 0 3 6 7 6 7s6-4 6-7c0-3-4.5-3-6 0z"
          fill="#E11D48"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </motion.svg>
    </div>
  );
}
