import { NextResponse } from "next/server";
import { getDBConnection } from "../db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    const db = await getDBConnection();

    if (key) {
      const [rows]: any = await db.query(
        "SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?",
        [key]
      );
      if (rows && rows.length > 0) {
        return NextResponse.json({ key: rows[0].setting_key, value: rows[0].setting_value });
      }
      return NextResponse.json({ key, value: null }, { status: 404 });
    }

    const [rows]: any = await db.query("SELECT setting_key, setting_value FROM system_settings");
    const settings: Record<string, string> = {};
    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        settings[r.setting_key] = r.setting_value;
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    const db = await getDBConnection();
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
