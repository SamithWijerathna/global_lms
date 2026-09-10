import { NextResponse } from "next/server";
import { getDBConnection } from "../db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: Request) {
  const defaultSettings: Record<string, string> = {
    site_title: "LMS Platform",
    site_short_name: "LMS",
    site_logo_url: "/assets/logo.png",
    site_favicon_url: "/assets/logo-icon.png",
    copyright_text: "© 2026 LMS Platform. All rights reserved.",
    contact_email: "support@lms.lk",
    contact_phone: "",
  };

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    const db = await getDBConnection(req);

    if (key) {
      const [rows]: any = await db.query(
        "SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?",
        [key]
      );
      if (rows && rows.length > 0) {
        return NextResponse.json({ key: rows[0].setting_key, value: rows[0].setting_value });
      }
      return NextResponse.json({ key, value: defaultSettings[key] || null });
    }

    const [rows]: any = await db.query("SELECT setting_key, setting_value FROM system_settings");
    const settings = { ...defaultSettings };

    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        if (r.setting_key && r.setting_value !== undefined) {
          settings[r.setting_key] = r.setting_value;
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.warn("Could not load settings from database, using defaults:", error);
    return NextResponse.json(defaultSettings);
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDBConnection(req);
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const uploadDir = path.join(process.cwd(), "public", "uploads", "branding");
      await mkdir(uploadDir, { recursive: true });

      const updatedSettings: Record<string, string> = {};

      // Handle Logo Upload
      const logoFile = formData.get("logo_file");
      if (logoFile && logoFile instanceof File && logoFile.size > 0) {
        const bytes = await logoFile.arrayBuffer();
        const buffer = new Uint8Array(bytes);
        const ext = path.extname(logoFile.name) || ".png";
        const filename = `logo-${Date.now()}${ext}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        const logoUrl = `/uploads/branding/${filename}`;
        await db.query(
          `INSERT INTO system_settings (setting_key, setting_value) VALUES ('site_logo_url', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [logoUrl]
        );
        updatedSettings["site_logo_url"] = logoUrl;
      }

      // Handle Favicon Upload
      const faviconFile = formData.get("favicon_file");
      if (faviconFile && faviconFile instanceof File && faviconFile.size > 0) {
        const bytes = await faviconFile.arrayBuffer();
        const buffer = new Uint8Array(bytes);
        const ext = path.extname(faviconFile.name) || ".ico";
        const filename = `favicon-${Date.now()}${ext}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        const faviconUrl = `/uploads/branding/${filename}`;
        await db.query(
          `INSERT INTO system_settings (setting_key, setting_value) VALUES ('site_favicon_url', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [faviconUrl]
        );
        updatedSettings["site_favicon_url"] = faviconUrl;
      }

      // Handle text fields in formData
      const textKeys = [
        "site_title",
        "site_short_name",
        "copyright_text",
        "contact_email",
        "contact_phone",
        "monthly_target",
      ];

      for (const k of textKeys) {
        const val = formData.get(k);
        if (val !== null && val !== undefined) {
          const strVal = String(val).trim();
          await db.query(
            `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
            [k, strVal]
          );
          updatedSettings[k] = strVal;
        }
      }

      return NextResponse.json({ success: true, updatedSettings });
    }

    // JSON payload
    const body = await req.json().catch(() => ({}));

    if (body.settings && typeof body.settings === "object") {
      const entries = Object.entries(body.settings);
      for (const [k, v] of entries) {
        await db.query(
          `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [k, String(v)]
        );
      }
      return NextResponse.json({ success: true, settings: body.settings });
    }

    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
      [key, String(value)]
    );

    return NextResponse.json({ success: true, key, value: String(value) });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
