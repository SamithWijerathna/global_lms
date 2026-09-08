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
  site_title: "LASHINIGEO LMS",
  site_short_name: "LASHINIGEO",
  site_logo_url: "/assets/logo.png",
  site_favicon_url: "/favicon.ico",
  copyright_text: "© 2026 Lashinigeo LMS. All rights reserved.",
  contact_email: "support@lashinigeo.lk",
  contact_phone: "+94 77 123 4567",
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

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          setSettings((prev) => ({
            ...prev,
            ...data,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch system settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && settings.site_title) {
      document.title = settings.site_title;
    }
    if (typeof window !== "undefined" && settings.site_favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = settings.site_favicon_url;
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
