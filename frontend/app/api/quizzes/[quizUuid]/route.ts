import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";

export async function GET() {
  try {
    const db = await getDBConnection();
    const [rows] = await db.query(`
      SELECT q.*,
             (SELECT COUNT(*) FROM questions WHERE quiz_uuid = q.uuid) AS num_questions
      FROM quizzes q
      ORDER BY create_at DESC
    `);
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}