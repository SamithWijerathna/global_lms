import { getDBConnection } from "../db";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const db = await getDBConnection();
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
    const [rows] = await db.query(
      "SELECT paper_id, mark_a, mark_b, create_at FROM students_marks WHERE student_uuid = ? ORDER BY create_at DESC",
      [student_uuid]
    );
    return NextResponse.json({ marks: rows });
  } catch (err) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
