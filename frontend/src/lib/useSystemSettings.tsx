"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface SystemSettings {
  site_title: string;
  site_short_name: string;
  site_logo_url: string;
  site_favicon_url: string;
  copyright_text: string;
  contact_email: string;
  contact_phone: string;
  monthly_target?: string;
  [key: string]: string | undefined;
}

const defaultSettings: SystemSettings = {
  site_title: "LMS Platform",
  site_short_name: "LMS",
  site_logo_url: "/assets/logo.png",
  site_favicon_url: "/assets/logo-icon.png",
  copyright_text: "© 2026 LMS Platform. All rights reserved.",
  contact_email: "support@lms.lk",
  contact_phone: "",
};

interface SystemSettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  refetchSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refetchSettings: async () => {},
});

export function SystemSettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: SystemSettings;
}) {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (
      initialSettings &&
      initialSettings.site_logo_url &&
      initialSettings.site_logo_url !== "/assets/logo.png"
    ) {
      return initialSettings;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("lms_system_settings");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return { ...defaultSettings, ...parsed };
          }
        }
      } catch (e) {}
    }
    return initialSettings || defaultSettings;
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          setSettings((prev) => {
            const next = {
              ...prev,
              ...data,
            };
            try {
              localStorage.setItem("lms_system_settings", JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch system settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      initialSettings &&
      initialSettings.site_logo_url &&
      initialSettings.site_logo_url !== "/assets/logo.png"
    ) {
      try {
        localStorage.setItem("lms_system_settings", JSON.stringify(initialSettings));
      } catch (e) {}
    }
    fetchSettings();
  }, [initialSettings]);

  useEffect(() => {
    if (typeof window !== "undefined" && settings.site_title) {
      document.title = settings.site_title;
    }
    if (typeof window !== "undefined") {
      const faviconUrl = settings.site_favicon_url || "/assets/logo-icon.png";
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      if (iconLinks.length > 0) {
        iconLinks.forEach((l) => {
          l.href = faviconUrl;
        });
      } else {
        const link = document.createElement("link");
        link.rel = "shortcut icon";
        link.href = faviconUrl;
        document.getElementsByTagName("head")[0].appendChild(link);
      }
    }
  }, [settings.site_title, settings.site_favicon_url]);

  return (
    <SystemSettingsContext.Provider
      value={{ settings, loading, refetchSettings: fetchSettings }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  return useContext(SystemSettingsContext);
}
