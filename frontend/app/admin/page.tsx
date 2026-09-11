"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { useSystemSettings } from "@/src/lib/useSystemSettings";

export default function AdminRootPage() {
  const router = useRouter();
  const { settings, refetchSettings } = useSystemSettings();

  useEffect(() => {
    refetchSettings();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth?action=me", {
          credentials: "include",
        });

        if (res.ok) {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/admin/login");
        }
      } catch {
        router.replace("/admin/login");
      }
    };

    const timer = setTimeout(checkAuth, 1000);

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
          key={settings.site_logo_url || "admin-loading-logo"}
          src={settings.site_logo_url || "/assets/logo.png"}
          alt={settings.site_title || "LMS Platform"}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/assets/logo.png";
          }}
          className="w-44 h-auto max-h-24 sm:w-56 sm:max-h-28 object-contain mb-6 transition-all drop-shadow-md"
        />
        <Spinner label="Checking admin session…" />
      </div>
    </div>
  );
}
