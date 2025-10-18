import "./globals.css";
import type { Metadata } from "next";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "SoulSync AI",
  description: "AI-Powered Dating App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-200">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
