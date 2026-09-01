// app/api/student/rank/route.ts
import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const student_uuid = searchParams.get("student_uuid");
    const paper_id = searchParams.get("paper_id");

    if (!student_uuid || !paper_id) {
      return NextResponse.json({ error: "Missing student_uuid or paper_id" }, { status: 400 });
    }

    const db = await getDBConnection();

    // Latest attempt for each student for the given paper
    const [latestRows] = await db.query<{ student_uuid: string; total: number }[]>(
      `
      SELECT sm.student_uuid, sm.mark_a + sm.mark_b AS total
      FROM students_marks sm
      INNER JOIN (
        SELECT student_uuid, MAX(create_at) AS max_date
        FROM students_marks
        WHERE paper_id = ?
        GROUP BY student_uuid
      ) t
      ON sm.student_uuid = t.student_uuid AND sm.create_at = t.max_date
      WHERE sm.paper_id = ?
    `,
      [paper_id, paper_id]
    );

    // Rank by total desc, with ties sharing the same rank
    const sorted = latestRows
      .map((r) => ({ ...r, total: Number(r.total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);

    let rank = null as number | null;
    let topScore = null as number | null;
    let totalStudents = sorted.length;

    if (sorted.length > 0) {
      topScore = sorted[0].total;
      // Compute rank with ties
      let currentRank = 0;
      let prevTotal: number | null = null;
      for (let i = 0; i < sorted.length; i++) {
        if (prevTotal === null || sorted[i].total !== prevTotal) {
          currentRank = i + 1;
          prevTotal = sorted[i].total;
        }
        if (sorted[i].student_uuid === student_uuid) {
          rank = currentRank;
          break;
        }
      }
    }

    return NextResponse.json({
      student_uuid,
      paper_id,
      rank,
      topScore,
      totalStudents,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}