import { getDBConnection } from "@/app/api/db";
import { headers } from "next/headers";

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
    let domain: string | null = null;
    let slug: string | null = null;
    try {
      const h = await headers();
      domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
      slug = h.get("x-tenant-slug");
    } catch {
      // Build-time / static page generation - no request headers available
      return settings;
    }

    if (!domain && !slug) {
      return settings;
    }

    const cleanDomain = domain ? domain.split(",")[0].trim().replace(/:\d+$/, "").toLowerCase() : "";
    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "lms.circleone.asia").toLowerCase();

    // If it's pure localhost without a tenant slug, or internal root domain, skip querying non-existent tenant db
    if ((!cleanDomain || cleanDomain.includes("localhost") || cleanDomain.includes("127.0.0.1") || cleanDomain === rootDomain) && !slug) {
      return settings;
    }

    const db = await getDBConnection(cleanDomain || slug || undefined);
    const [rows]: any = await db.query("SELECT setting_key, setting_value FROM system_settings");
    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        if (r.setting_key && r.setting_value !== undefined && r.setting_value !== null) {
          settings[r.setting_key] = r.setting_value;
        }
      });
    }
  } catch (err: any) {
    if (err?.code !== "ER_BAD_DB_ERROR" && err?.code !== "ER_NO_SUCH_TABLE") {
      console.warn("[SYSTEM_SETTINGS_SERVER WARN]", err?.message || err);
    }
  }
  return settings;
}

