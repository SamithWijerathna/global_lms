import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";

type MarkRow = {
  id: number;
  student_uuid: string;
  paper_id: string;
  paper_name: string | null;
  mark_a: number;
  mark_b: number;
  create_at: string;
};


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const student_uuid = searchParams.get("student_uuid");
    const withAverage = searchParams.get("withAverage") === "true";

    const db = await getDBConnection();

    if (student_uuid) {
      const [rows] = await db.query<MarkRow[]>(
        `
        SELECT
          sm.id,
          sm.student_uuid,
          sm.paper_id,
          sm.mark_a,
          sm.mark_b,
          sm.create_at,
          pp.paper_name
        FROM students_marks sm
        LEFT JOIN paper_predefine pp ON sm.paper_id = pp.paper_id
        WHERE sm.student_uuid = ?
        ORDER BY sm.create_at ASC
      `,
        [student_uuid]
      );

      const bestPerPaper = new Map<
        string,
        { total: number; paper_name: string | null }
      >();
      let latestPaperId: string | null = null;

      for (const r of rows) {
        const total = r.mark_a + r.mark_b;
        const prev = bestPerPaper.get(r.paper_id);
        if (!prev || total > prev.total) {
          bestPerPaper.set(r.paper_id, { total, paper_name: r.paper_name ?? null });
        }
        latestPaperId = r.paper_id;
      }

      let bestPaper: {
        paper_id: string;
        paper_name: string | null;
        best_total: number;
      } | null = null;

      if (bestPerPaper.size > 0) {
        const sorted = [...bestPerPaper.entries()]
          .map(([paper_id, v]) => ({
            paper_id,
            paper_name: v.paper_name,
            best_total: v.total,
          }))
          .sort((a, b) => b.best_total - a.best_total);
        bestPaper = sorted[0];
      }

      const trend = rows.map((r) => ({
        id: r.id,
        paper_id: r.paper_id,
        paper_name: r.paper_name ?? r.paper_id,
        date: new Date(r.create_at).toISOString().slice(0, 10),
        total: Number((r.mark_a + r.mark_b).toFixed(2)),
        mcq: Number(r.mark_a.toFixed(2)),
        essay: Number(r.mark_b.toFixed(2)),
      }));

      let classAverageTrend: Array<{ date: string; average: number }> = [];

      if (withAverage && latestPaperId) {
        const [classAvgRows] = await db.query<{ date: string; avg_total: number }[]>(
          `
          SELECT DATE(sm.create_at) AS date, AVG(sm.mark_a + sm.mark_b) AS avg_total
          FROM students_marks sm
          WHERE sm.paper_id = ?
          GROUP BY DATE(sm.create_at)
          ORDER BY DATE(sm.create_at) ASC
        `,
          [latestPaperId]
        );

        classAverageTrend = classAvgRows.map((r) => ({
          date: r.date,
          average: Number(r.avg_total.toFixed(2)),
        }));
      }

      return NextResponse.json({
        student_uuid,
        latestPaperId,
        bestPaper,
        trend,
        classAverageTrend,
      });
    }

    const [rows] = await db.query(`
      SELECT 
        sm.id,
        sm.student_uuid,
        sm.paper_id,
        sm.mark_a,
        sm.mark_b,
        sm.create_at,
        sm.update_at,
        u.student_id,
        u.first_name,
        u.last_name,
        u.user_email,
        u.batch,
        pp.paper_name
      FROM students_marks sm
      LEFT JOIN users u ON sm.student_uuid = u.uuid
      LEFT JOIN paper_predefine pp ON sm.paper_id = pp.paper_id
      ORDER BY sm.id DESC
    `);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching marks:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDBConnection();
    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "edit_mark") {
      const id = formData.get("id") as string;
      const mcqValue = formData.get("mark_mcq");
      const essayValue = formData.get("mark_essay");

      if (!id || !mcqValue || !essayValue) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const mark_a = parseFloat(mcqValue.toString());
      const mark_b = parseFloat(essayValue.toString());

      if (isNaN(mark_a) || isNaN(mark_b)) {
        return NextResponse.json({ error: "Invalid mark values" }, { status: 400 });
      }

      await db.query(
        "UPDATE students_marks SET mark_a = ?, mark_b = ?, update_at = CURRENT_TIMESTAMP WHERE id = ?",
        [mark_a, mark_b, id]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating mark:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const db = await getDBConnection();
    await db.query("DELETE FROM students_marks WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mark:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
