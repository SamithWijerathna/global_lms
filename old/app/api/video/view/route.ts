import { NextRequest, NextResponse } from "next/server";
import { query } from "../../db";

export async function POST(req: NextRequest) {
  try {
    const { user_uuid, material_id, action } = await req.json();
    if (!user_uuid || !material_id || !["check", "inc"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    // Get material info
    const materials = await query<any>(
      `SELECT
        view_count_enabled,
        view_limit,
        expire_hours,
        create_at
      FROM class_material_list
      WHERE material_id = ?`,
      [material_id]
    );
    if (!materials.length) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
    const material = materials[0];

    // Expiry check
    if (material.expire_hours && material.expire_hours !== "unlimited") {
      const expireAt =
        new Date(material.create_at).getTime() +
        material.expire_hours * 60 * 60 * 1000;
      if (Date.now() > expireAt) {
        return NextResponse.json({
          expired: true,
          allowed: false,
        });
      }
    }

    // View count
    const views = await query<any>(
      `SELECT view_count FROM video_views
      WHERE user_uuid = ? AND material_id = ?`,
      [user_uuid, material_id]
    );
    const count = views[0]?.view_count ?? 0;

    if (action === "check") {
      if (material.view_limit_enabled && count >= material.view_limit) {
        return NextResponse.json({
          allowed: false,
          count,
        });
      }
      return NextResponse.json({
        allowed: true,
        count,
      });
    }

    if (action === "inc") {
      await query(
        `INSERT INTO video_views (user_uuid, material_id, view_count, last_view_at)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           view_count = view_count + 1,
           last_view_at = NOW()`,
        [user_uuid, material_id]
      );
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error("Video view API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}