"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    // console.log("🔍 AuthGuard check, user_id:", id);
     // ✅ log it

    if (!id) {
      setIsChecking(false); // stop spinner before redirect
      router.replace(`/${locale}/login`);
      return;
    }

    setIsAuthenticated(true);
    setIsChecking(false);
  }, [router, locale]);

  if (isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Checking authentication...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting...
  }

  return <>{children}</>;
}
