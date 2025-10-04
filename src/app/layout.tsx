// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import RootClient from "./RootClient";

export const metadata: Metadata = {
  title: "SoulSync AI",
  description: "AI-Powered Dating App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-200">
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
