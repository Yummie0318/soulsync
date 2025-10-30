"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Pencil, Eraser, Trash2 } from "lucide-react";

export default function AiDrawingPage() {
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState("#e11d48"); // default pink
  const [isEraser, setIsEraser] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const t = useTranslations("AiDrawing");

  // Progress + redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            router.push(`/${locale}/login/tree-quiz`);
          }, 500);
          return 100;
        }
        return prev + 1.5;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [router, locale]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctxRef.current = ctx;
  }, []);

  // Update stroke color / eraser
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = isEraser ? "#f3f4f6" : color; // light gray as eraser
    }
  }, [color, isEraser]);

  // Get pointer position
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };
    }
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPos(e);
    if (ctxRef.current && lastPoint.current) {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(lastPoint.current.x, lastPoint.current.y);
    }
  };

  // Draw line
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !ctxRef.current) return;
    const pos = getPos(e);

    if (lastPoint.current) {
      const { x: lx, y: ly } = lastPoint.current;
      const midX = (lx + pos.x) / 2;
      const midY = (ly + pos.y) / 2;
      ctxRef.current.quadraticCurveTo(lx, ly, midX, midY);
      ctxRef.current.stroke();
      lastPoint.current = pos;
    } else {
      lastPoint.current = pos;
    }
  };

  // Stop drawing
  const endDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    drawing.current = false;
    lastPoint.current = null;
  };

  // Clear canvas
  const clearCanvas = () => {
    if (ctxRef.current && canvasRef.current) {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-300" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6 border border-white/20 text-center">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-2xl font-bold text-white"
        >
          {t("title")}
        </motion.h1>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mt-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
            className="h-3 bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-400"
          />
        </div>

        {/* Drawing Area */}
        <div className="mt-6 mx-auto w-72 h-72 bg-gray-100 rounded-2xl shadow-lg border-4 border-pink-400/50 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-2xl cursor-crosshair touch-none select-none"
            onMouseDown={startDrawing}
            onMouseUp={endDrawing}
            onMouseMove={draw}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchEnd={endDrawing}
            onTouchMove={draw}
          />
        </div>

        {/* Toolbar */}
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={() => setIsEraser(false)}
            className={`p-2 rounded-xl ${!isEraser ? "bg-pink-500" : "bg-white/10"}`}
          >
            <Pencil className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`p-2 rounded-xl ${isEraser ? "bg-pink-500" : "bg-white/10"}`}
          >
            <Eraser className="w-5 h-5 text-white" />
          </button>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer"
          />
          <button
            onClick={clearCanvas}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Hint */}
        <p className="text-sm text-gray-400">{t("loading")}</p>
      </div>
    </main>
  );
}
