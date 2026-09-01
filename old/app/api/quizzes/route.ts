
import { NextRequest, NextResponse } from "next/server";
import { getDBConnection } from "../db";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const db = await getDBConnection();

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

    // Get all quizzes and left join with quiz_attempts for this student
    const [rows] = await db.query(
      `SELECT q.*, qa.score, qa.completed_at,
              (SELECT COUNT(*) FROM questions WHERE quiz_uuid = q.uuid) as num_questions
       FROM quizzes q
       LEFT JOIN quiz_attempts qa
         ON q.uuid = qa.quiz_uuid AND qa.student_uuid = ?
       ORDER BY q.create_at DESC`,
      [student_uuid]
    );
    return NextResponse.json({ quizzes: rows });
  } catch (err) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}