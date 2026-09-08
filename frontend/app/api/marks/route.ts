import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../db";

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const student_uuid = searchParams.get("student_uuid");
    const mark_id = searchParams.get("mark_id");
    const withAverage = searchParams.get("withAverage") === "true";
    const db = await getDBConnection();

    if (mark_id) {
      const [rows] = await db.query(
        `
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
          pp.paper_name,
          pp.paper_cover_image
        FROM students_marks sm
        LEFT JOIN users u ON sm.student_uuid = u.uuid
        LEFT JOIN paper_predefine pp ON sm.paper_id = pp.paper_id
        WHERE sm.id = ?
      `,
        [mark_id]
      );
      return NextResponse.json(rows[0] || null);
    }

    if (student_uuid) {
      const [rows] = await db.query(
        `
        SELECT
          sm.id,
          sm.student_uuid,
          sm.paper_id,
          sm.mark_a,
          sm.mark_b,
          sm.create_at,
          pp.paper_name,
          pp.paper_cover_image
        FROM students_marks sm
        LEFT JOIN paper_predefine pp ON sm.paper_id = pp.paper_id
        WHERE sm.student_uuid = ?
        ORDER BY sm.create_at ASC
      `,
        [student_uuid]
      );
      // Existing analytics logic (best paper, trend, class average for latest)
      const bestPerPaper = new Map<string, { total: number; paper_name: string | null }>();
      let latestPaperId: string | null = null;
      for (const r of rows) {
        const total = r.mark_a + r.mark_b;
        const prev = bestPerPaper.get(r.paper_id);
        if (!prev || total > prev.total) {
          bestPerPaper.set(r.paper_id, { total, paper_name: r.paper_name ?? null });
        }
        latestPaperId = r.paper_id;
      }
      let bestPaper = null;
      if (bestPerPaper.size > 0) {
        const sorted = [...bestPerPaper.entries()]
          .map(([paper_id, v]) => ({ paper_id, paper_name: v.paper_name, best_total: v.total }))
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
        const [classAvgRows] = await db.query(
          `
          SELECT DATE(sm.create_at) AS date, AVG(sm.mark_a + sm.mark_b) AS avg_total
          FROM students_marks sm
          WHERE sm.paper_id = ?
          GROUP BY DATE(sm.create_at)
          ORDER BY DATE(sm.create_at) ASC
        `,
          [latestPaperId]
        );
        classAverageTrend = classAvgRows.map((r: any) => ({
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

    // All marks
    const [rows] = await db.query(
      `
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
        pp.paper_name,
        pp.paper_cover_image
      FROM students_marks sm
      LEFT JOIN users u ON sm.student_uuid = u.uuid
      LEFT JOIN paper_predefine pp ON sm.paper_id = pp.paper_id
      ORDER BY sm.id DESC
    `
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching marks:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "add_mark") {
      const student_uuid = formData.get("student_uuid") as string;
      const paper_id = formData.get("paper_id") as string;
      const mcqValue = formData.get("mark_mcq");
      const essayValue = formData.get("mark_essay");
      if (!student_uuid || !paper_id) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const mark_a = mcqValue ? parseFloat(mcqValue.toString()) : 0;
      const mark_b = essayValue ? parseFloat(essayValue.toString()) : 0;
      if (isNaN(mark_a) || isNaN(mark_b)) {
        return NextResponse.json({ error: "Invalid mark values" }, { status: 400 });
      }
      await db.query(
        "INSERT INTO students_marks (student_uuid, paper_id, mark_a, mark_b) VALUES (?, ?, ?, ?)",
        [student_uuid, paper_id, mark_a, mark_b]
      );
      return NextResponse.json({ success: true });
    }

    if (action === "edit_mark") {
      const id = formData.get("id") as string;
      const mcqValue = formData.get("mark_mcq");
      const essayValue = formData.get("mark_essay");
      if (!id || !mcqValue || !essayValue) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    const db = await getDBConnection();
    await db.query("DELETE FROM students_marks WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mark:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}