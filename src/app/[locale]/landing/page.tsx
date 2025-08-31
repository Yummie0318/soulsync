"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const t = useTranslations("LandingPage");

  const [dots, setDots] = useState<
    { x: number; y: number; size: number; dx: number; dy: number; duration: number }[]
  >([]);

  // Generate dots only on client side
  useEffect(() => {
    const generated = Array.from({ length: 25 }).map(() => {
      const x = Math.random() * 1200;
      const y = Math.random() * 800;
      const size = 3 + Math.random() * 4; // smaller dots
      const dx = 15 + Math.random() * 20; // smooth movement
      const dy = 15 + Math.random() * 20;
      const duration = 8 + Math.random() * 4; // smooth, slow loop
      return { x, y, size, dx, dy, duration };
    });
    setDots(generated);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden text-gray-200">
      
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient layers */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-900 via-pink-900 to-blue-900"
          style={{ backgroundSize: "400% 400%" }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-800 to-pink-900 mix-blend-overlay opacity-60"
          style={{ backgroundSize: "400% 400%" }}
          animate={{ backgroundPosition: ["100% 50%", "0% 50%", "100% 50%"] }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        />

        {/* Floating dots */}
        {dots.map(({ x, y, size, dx, dy, duration }, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 opacity-70"
            style={{ width: size * 2, height: size * 2, transform: `translate(${x}px, ${y}px)` }}
            animate={{
              x: [x, x + dx, x, x - dx, x],
              y: [y, y + dy, y, y - dy, y],
            }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Blurred background circles */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-800/30 to-pink-800/30 rounded-full blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-800/30 to-blue-800/30 rounded-full blur-3xl"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 140, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-6 md:px-12 lg:px-20 pt-8 lg:pt-16">
                {/* Hero Image */}
     {/* Hero Image */}
<div className="relative flex justify-center">
  <div className="viral-match-card p-1 rounded-3xl">
    <Image
      src="/soulpic.png"
      alt="SoulSync Hero"
      width={700}
      height={400}
      className="w-full h-55 sm:h-60 md:h-72 lg:h-80 object-cover rounded-2xl shadow-2xl pulse-glow border-4 border-pink-500"
      priority
    />
  </div>

  {/* Floating circles */}
  <motion.div
    className="absolute -top-4 sm:-top-6 -right-6 w-12 h-12 rounded-full bg-cyan-400 opacity-80 shadow-[0_0_20px_rgba(0,255,255,0.7)]"
    animate={{ scale: [1, 1.2, 1] }}
    transition={{ repeat: Infinity, duration: 3 }}
  />
  <motion.div
    className="absolute -bottom-4 sm:-bottom-6 -left-6 w-14 h-14 rounded-full bg-pink-500 opacity-80 shadow-[0_0_25px_rgba(255,100,150,0.8)]"
    animate={{ y: [0, -12, 0] }}
    transition={{ repeat: Infinity, repeatType: "loop", duration: 0.6, ease: "easeInOut" }}
  />
</div>


        {/* Hero Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          {/* Title & Logo */}
          <div className="flex flex-row flex-wrap items-center justify-center md:justify-start gap-2">
            <motion.div
              className="relative pulse-glow w-20 h-20 flex-shrink-0"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <div className="w-20 h-20 flex items-center justify-center neon-glass rounded-2xl">
                {/* SVG Logo */}
                <svg width="60" height="60" viewBox="0 0 60 60" className="float-animation">
                  <ellipse cx="30" cy="30" rx="20" ry="15" fill="none" stroke="url(#gradient1)" strokeWidth="3" transform="rotate(-20 30 30)" />
                  <ellipse cx="30" cy="30" rx="20" ry="15" fill="none" stroke="url(#gradient2)" strokeWidth="3" transform="rotate(20 30 30)" />
                  <path d="M30 18c-3-6-12-6-12 0 0 6 12 15 12 15s12-9 12-15c0-6-9-6-12 0z" fill="url(#heartGradient)" transform="translate(-6, 3) scale(0.7)" />
                  <path d="M30 18c-3-6-12-6-12 0 0 6 12 15 12 15s12-9 12-15c0-6-9-6-12 0z" fill="url(#heartGradient)" transform="translate(6, 3) scale(0.7)" />
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF1493" />
                      <stop offset="100%" stopColor="#FF8C00" />
                    </linearGradient>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00FFFF" />
                      <stop offset="100%" stopColor="#FF1493" />
                    </linearGradient>
                    <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF1493" />
                      <stop offset="50%" stopColor="#FF6B6B" />
                      <stop offset="100%" stopColor="#FF8C00" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-cyan-500/30 rounded-2xl blur-sm"></div>
            </motion.div>

            <div className="text-center md:text-left">
              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,150,200,0.9)]"
                animate={{ textShadow: ["0 0 10px #ff66cc","0 0 25px #00ffff","0 0 10px #ff66cc"] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                SoulSync AI
              </motion.h1>
              <motion.p
                className="text-lg md:text-xl font-medium text-orange-400 tracking-wide"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                AI-Powered Dating
              </motion.p>
            </div>
          </div>

          <p className="mt-0 max-w-md text-gray-400">{t("subtitle")}</p>


          <div className="mt-5 w-full relative flex justify-center lg:justify-start">
  <motion.span
    className="absolute -top-6 px-4 py-2 rounded-full bg-gradient-to-r from-blue-300 to-blue-100 text-sm font-bold text-white shadow-lg left-1/2 transform -translate-x-1/2 lg:translate-x-0 lg:left-24"
    animate={{
      y: [0, -25, 0, -12, 0], // first lower jump, then small smooth bounce
    }}
    transition={{
      duration: 1.2,                 // total cycle duration
      ease: "easeInOut",             // smooth easing
      times: [0, 0.4, 0.7, 0.85, 1], 
      repeat: Infinity,
      repeatDelay: 2,                // pause before next cycle
    }}
  >
    {t("trending")}
  </motion.span>
</div>








         <div className="mt-2 w-full flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">

 {/* Get Started Button */}
{/* Get Started Button */}
<motion.button
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
  whileTap={{ scale: 0.97 }}
  className="relative w-full sm:w-48 px-8 py-4 rounded-full text-white font-bold flex items-center justify-center space-x-2 shadow-lg dual-wave-btn hover:shadow-xl overflow-hidden transition-all duration-300"
  style={{
    boxShadow: "0 0 28px rgba(255, 20, 147, 0.5)", // pink glow
  }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    viewBox="0 0 24 24"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
    <path d="M20 3v4"></path>
    <path d="M22 5h-4"></path>
    <path d="M4 17v2"></path>
    <path d="M5 18H3"></path>
  </svg>
  <span>Get Started</span>
</motion.button>


  {/* Login Button */}
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
    whileTap={{ scale: 0.97 }}
    className="relative w-full sm:w-48 px-6 py-3 rounded-full border-2 border-white/50 text-white flex items-center justify-center space-x-2 shadow-lg overflow-hidden transition-all duration-300 hover:bg-pink-500/20 hover:shadow-xl"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      viewBox="0 0 24 24"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
    </svg>
    <span className="relative z-10">{t("login")}</span>
  </motion.button>
</div>


          
        </div>
      </section>

{/* Features Section */}
<section className="mt-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-12 lg:px-20">
  <div className="grid grid-cols-3 gap-4">
    {[
      { icon: Zap, color: "yellow-400", text: "feature1" },
      { icon: Heart, color: "pink-400", text: "feature2" },
      { icon: Star, color: "blue-400", text: "feature3" },
    ].map(({ icon: Icon, color, text }, idx) => (
      <motion.div
        key={idx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: idx * 0.2, // stagger entrance
          duration: 0.5,
          ease: "easeOut",
        }}
        whileHover={{
          y: -5, // subtle float on hover
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        className="w-full neon-glass rounded-3xl p-5 md:p-6 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-3 
                   bg-gradient-to-br from-pink-500/10 via-white/5 to-blue-500/10 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all"
      >
        <motion.div
          className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center"
          whileHover={{ rotate: 15 }} // tilt icon on hover
        >
          {/* Neon Circle */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "4rem",
              height: "4rem",
              backgroundColor: `rgba(255, 255, 255, 0.05)`,
              boxShadow: `0 0 25px rgba(255,255,255,0.25), 0 0 50px rgba(255,255,255,0.15)`,
            }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          {/* Icon */}
          <Icon className={`w-7 h-7 md:w-8 md:h-8 text-${color} relative z-10`} />
        </motion.div>
        <p className="text-sm md:text-base font-semibold text-blue-200">{t(text)}</p>
      </motion.div>
    ))}
  </div>
</section>





    </main>
  );
}
