
import { NextRequest, NextResponse } from "next/server";
import { getDBConnection } from "../../db";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const db = await getDBConnection();
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "classes") {
      // Get student_uuid from JWT
      let accessToken;
      if (typeof (req as any).cookies?.get === "function") {
        accessToken = (req as any).cookies.get("accessToken")?.value;
      } else {
        const cookieHeader = req.headers.get("cookie");
        if (cookieHeader) {
          const match = cookieHeader.match(/accessToken=([^;]+)/);
          if (match) accessToken = match[1];
        }
      }
      if (!accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "your-secret-key");
        const student_uuid = (decoded as any).uuid;
        // Join students_marks with class_list
        const [rows] = await db.query(
          `SELECT cl.* FROM class_list cl
           JOIN students_marks sm ON cl.class_id = sm.paper_id
           WHERE sm.student_uuid = ?
           ORDER BY cl.create_at DESC`,
          [student_uuid]
        );
        return NextResponse.json({ classes: rows });
      } catch (err) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    if (action === "class_data") {
      const [rows] = await db.query("SELECT * FROM class_list ORDER BY display_order ASC, id DESC");
      return NextResponse.json(rows);
    }

    return NextResponse.json({ valid: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
