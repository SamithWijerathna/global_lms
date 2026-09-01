import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import { v4 as uuidv4 } from "uuid";

/* ---------------- GET: FETCH ALL QUIZZES ---------------- */
export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const [rows] = await db.query(`
    SELECT q.*, 
           (SELECT COUNT(*) FROM questions WHERE quiz_uuid = q.uuid) AS num_questions
    FROM quizzes q 
    ORDER BY create_at DESC
  `);
  return NextResponse.json(rows);
}

/* ---------------- POST: CREATE QUIZ ---------------- */
export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const { title, description, is_timed = 1, default_duration = 30, allow_toggle_timing = 1, min_duration = 10, max_duration = 60 } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const uuid = uuidv4();
    await db.query(
      `INSERT INTO quizzes 
       (uuid, title, description, is_timed, default_duration, allow_toggle_timing, min_duration, max_duration, create_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [uuid, title, description || null, is_timed ? 1 : 0, default_duration, allow_toggle_timing ? 1 : 0, min_duration, max_duration]
    );

    return NextResponse.json({ success: true, uuid });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------- PUT: UPDATE QUIZ ---------------- */
export async function PUT(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const { uuid, title, description, is_timed, default_duration, allow_toggle_timing, min_duration, max_duration } = body;

    if (!uuid || !title) {
      return NextResponse.json({ error: "UUID and title required" }, { status: 400 });
    }

    const [result]: any = await db.query(
      `UPDATE quizzes SET title=?, description=?, is_timed=?, default_duration=?, allow_toggle_timing=?, min_duration=?, max_duration=?
       WHERE uuid=?`,
      [title, description || null, is_timed ? 1 : 0, default_duration, allow_toggle_timing ? 1 : 0, min_duration, max_duration, uuid]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------- DELETE: REMOVE QUIZ ---------------- */
export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const uuid = searchParams.get("uuid");
    if (!uuid) {
      return NextResponse.json({ error: "Missing UUID" }, { status: 400 });
    }

    const [result]: any = await db.query("DELETE FROM quizzes WHERE uuid = ?", [uuid]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }