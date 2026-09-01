"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Atom } from "react-loading-indicators";
export default function LoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check-session", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.valid) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    };

    const timer = setTimeout(checkAuth, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="relative flex items-center justify-center h-screen w-screen overflow-hidden"
      style={{
        backgroundImage: "url('/assets/loading-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 pointer-events-none apple-glow" />

      <div className="relative z-10 flex flex-col items-center">
        <img
          src="/assets/logo.png"
          alt="LASHINIGEO LMS"
          className="w-32 h-32 sm:w-36 sm:h-36 object-contain mb-4 filter dark:brightness-0 dark:invert transition-all drop-shadow-md"
        />
          <Atom color="#868282" size="medium" text="" textColor="" />
      </div>
    </div>
  );
}
