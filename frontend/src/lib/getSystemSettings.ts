import { getDBConnection } from "@/app/api/db";

export interface SystemSettings {
  site_title: string;
  site_short_name: string;
  site_logo_url: string;
  site_favicon_url: string;
  copyright_text: string;
  contact_email: string;
  contact_phone: string;
  [key: string]: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  site_title: "LMS Platform",
  site_short_name: "LMS",
  site_logo_url: "/assets/logo.png",
  site_favicon_url: "/assets/logo-icon.png",
  copyright_text: "© 2026 LMS Platform. All rights reserved.",
  contact_email: "support@lms.lk",
  contact_phone: "",
};

export async function getSystemSettingsServer(): Promise<SystemSettings> {
  const settings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
  try {
    const db = await getDBConnection();
    const [rows]: any = await db.query("SELECT setting_key, setting_value FROM system_settings");
    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        if (r.setting_key && r.setting_value !== undefined && r.setting_value !== null) {
          settings[r.setting_key] = r.setting_value;
        }
      });
    }
  } catch (err) {
    console.error("Error fetching system settings server-side:", err);
  }
  return settings;
}
