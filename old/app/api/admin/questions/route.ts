import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import { v4 as uuidv4 } from "uuid";

async function saveQuestionLogic(body: any, questionUuid: string, isUpdate: boolean) {
  const {
    quiz_uuid,
    type,
    question_text,
    explanation,
    image_url,
    points = 5,
    positive_points = 1,
    negative_points = 1,
    options = [],
    statements = []
  } = body;

  if (!quiz_uuid || !type || !question_text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = await getDBConnection();

  if (isUpdate) {
    await db.query(
      `UPDATE questions 
       SET type = ?, question_text = ?, explanation = ?, image_url = ?, 
           points = ?, positive_points = ?, negative_points = ? 
       WHERE uuid = ?`,
      [type, question_text, explanation || null, image_url || null, points, positive_points, negative_points, questionUuid]
    );
  } else {
    await db.query(
      `INSERT INTO questions 
       (uuid, quiz_uuid, type, question_text, explanation, image_url, points, positive_points, negative_points, create_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [questionUuid, quiz_uuid, type, question_text, explanation || null, image_url || null, points, positive_points, negative_points]
    );
  }

  await db.query("DELETE FROM question_options WHERE question_uuid = ?", [questionUuid]);
  await db.query("DELETE FROM question_statements WHERE question_uuid = ?", [questionUuid]);

  if ((type === "mcq" || type === "abcd") && Array.isArray(options) && options.length > 0) {
    const optionValues = options.map((o: any) => [
      questionUuid,
      o.letter,
      o.text || "",
      o.image_url || null,
      o.is_correct ? 1 : 0
    ]);
    await db.query(
      `INSERT INTO question_options (question_uuid, letter, text, image_url, is_correct) VALUES ?`,
      [optionValues]
    );
  }

  if (type === "statement" && Array.isArray(statements) && statements.length > 0) {
    const stmtValues = statements.map((s: any) => [
      questionUuid,
      s.index || 0,
      s.text || "",
      s.is_correct ? 1 : 0
    ]);
    await db.query(
      `INSERT INTO question_statements (question_uuid, \`index\`, text, is_correct) VALUES ?`,
      [stmtValues]
    );
  }

  return NextResponse.json({ success: true, uuid: questionUuid });
}

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  try {
    const body = await req.json();
    const questionUuid = uuidv4();
    return await saveQuestionLogic(body, questionUuid, false);
  } catch (err: any) {
    console.error("Create question error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  try {
    const body = await req.json();
    const { uuid } = body;
    if (!uuid) return NextResponse.json({ error: "UUID required for update" }, { status: 400 });
    return await saveQuestionLogic(body, uuid, true);
  } catch (err: any) {
    console.error("Update question error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const { searchParams } = new URL(req.url);
  const quiz_uuid = searchParams.get("quiz_uuid");
  if (!quiz_uuid) return NextResponse.json({ error: "quiz_uuid required" }, { status: 400 });

  try {

    const [questions]: any = await db.query(
      `SELECT uuid, type, question_text, explanation, image_url, points, positive_points, negative_points 
       FROM questions 
       WHERE quiz_uuid = ? 
       ORDER BY create_at ASC`,
      [quiz_uuid]
    );

    for (const q of questions) {
      if (q.type !== "statement") {
        const [opts] = await db.query(
          `SELECT letter, text, image_url, is_correct 
           FROM question_options 
           WHERE question_uuid = ? 
           ORDER BY letter`,
          [q.uuid]
        );
        q.options = opts;
        q.statements = [];
      } else {
        const [stmts] = await db.query(
          `SELECT \`index\`, text, is_correct 
           FROM question_statements 
           WHERE question_uuid = ? 
           ORDER BY \`index\``,
          [q.uuid]
        );
        q.statements = stmts;
        q.options = [];
      }
    }

    return NextResponse.json(questions);

  } catch (err: any) {
    console.error("GET questions error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch questions" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get("uuid");
  const quiz_uuid = searchParams.get("quiz_uuid");
  const all = searchParams.get("all");

  try {
    const db = await getDBConnection();

    // Delete all questions for a quiz (used when saving quiz)
    if (quiz_uuid && all === "true") {
      const [questions]: any = await db.query(
        "SELECT uuid FROM questions WHERE quiz_uuid = ?",
        [quiz_uuid]
      );
      for (const q of questions) {
        await db.query("DELETE FROM question_options WHERE question_uuid = ?", [q.uuid]);
        await db.query("DELETE FROM question_statements WHERE question_uuid = ?", [q.uuid]);
      }
      await db.query("DELETE FROM questions WHERE quiz_uuid = ?", [quiz_uuid]);
      return NextResponse.json({ success: true, deleted: questions.length });
    }

    // Delete single question
    if (uuid) {
      await db.query("DELETE FROM question_options WHERE question_uuid = ?", [uuid]);
      await db.query("DELETE FROM question_statements WHERE question_uuid = ?", [uuid]);
      await db.query("DELETE FROM questions WHERE uuid = ?", [uuid]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing uuid or quiz_uuid" }, { status: 400 });

  } catch (err: any) {
    console.error("DELETE question error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}