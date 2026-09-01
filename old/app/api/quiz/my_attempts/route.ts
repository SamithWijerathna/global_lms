// app/api/quiz/my_attempts/route.ts (New API for student history)
import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const student_uuid = searchParams.get("student_uuid");
    if (!student_uuid) {
      return NextResponse.json({ error: "Missing student_uuid" }, { status: 400 });
    }
    const db = await getDBConnection();
    const [rows] = await db.query(`
      SELECT a.*, q.title AS quiz_title
      FROM quiz_attempts a
      JOIN quizzes q ON a.quiz_uuid = q.uuid
      WHERE a.student_uuid = ?
      ORDER BY a.completed_at DESC
    `, [student_uuid]);
    const normalizedRows = (rows as any[]).map((row) => {
      const rawAnswers = row.answers_json ?? row.answers ?? row.answer_json ?? null;
      const answers_available =
        (typeof rawAnswers === "string" && rawAnswers.trim().length > 0) ||
        (typeof rawAnswers === "object" && rawAnswers !== null && Object.keys(rawAnswers).length > 0);

      return {
        ...row,
        total_points: row.total_points ?? row.total_possible ?? 0,
        answers_json:
          typeof rawAnswers === "string"
            ? rawAnswers
            : rawAnswers != null
            ? JSON.stringify(rawAnswers)
            : null,
        answers_available,
        time_taken: row.time_taken ?? null,
      };
    });
    return NextResponse.json(normalizedRows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}