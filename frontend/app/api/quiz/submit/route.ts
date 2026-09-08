// app/api/quiz/submit/route.ts (Fixed scoring with proper options loading and letter mapping)
import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { quiz_uuid, student_uuid, answers, time_taken } = await req.json();
    if (!quiz_uuid || !student_uuid || answers == null || typeof answers !== "object") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const db = await getDBConnection();

    const [quizRows] = await db.query("SELECT * FROM quizzes WHERE uuid = ?", [quiz_uuid]);
    if (!(quizRows as any[]).length) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Load questions with aggregated options/statements and letter mapping
    const [qRows] = await db.query(`
      SELECT 
        q.uuid AS question_id,
        q.type,
        q.points,
        q.positive_points,
        q.negative_points,
        (SELECT COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'letter', 
              CASE 
                WHEN o.letter = 'A' THEN '1'
                WHEN o.letter = 'B' THEN '2'
                WHEN o.letter = 'C' THEN '3'
                WHEN o.letter = 'D' THEN '4'
                WHEN o.letter = 'E' THEN '5'
                ELSE o.letter
              END,
              'text', o.text, 
              'is_correct', o.is_correct
            )
          ), JSON_ARRAY()
        )
         FROM question_options o 
         WHERE o.question_uuid = q.uuid
        ) AS options,
        (SELECT COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT('index', s.index, 'text', s.text, 'is_correct', s.is_correct)
          ), JSON_ARRAY()
        )
         FROM question_statements s 
         WHERE s.question_uuid = q.uuid
        ) AS statements
      FROM questions q
      WHERE q.quiz_uuid = ?
    `, [quiz_uuid]);

    let obtained = 0;
    let max = 0;
    const questionResults: any[] = [];

    for (const q of qRows as any[]) {
      // Parse JSON if string (driver dependent)
      const options = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
      const statements = typeof q.statements === "string" ? JSON.parse(q.statements) : q.statements;

      const points = q.points || q.positive_points || 0;
      max += points;

      const userAns = answers[q.question_id];
      let isCorrect = false;
      let pointsEarned = 0;

      if (q.type === "mcq") {
        if (!Array.isArray(options) || options.length === 0) continue;

        const correct = options
          .filter((o: any) => o.is_correct)
          .map((o: any) => o.letter);

        const selected = Array.isArray(userAns) ? userAns : [];

        const allCorrect = correct.every((l: string) => selected.includes(l));
        const noWrong = selected.every((l: string) => correct.includes(l));

        if (allCorrect && noWrong) {
          obtained += points;
          isCorrect = true;
          pointsEarned = points;
        }

        questionResults.push({
          question_id: q.question_id,
          type: q.type,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          max_points: points,
          user_answer: selected,
          correct_answer: correct,
          options: options
        });
      } else if (q.type === "statement") {
        if (!Array.isArray(statements) || statements.length === 0) continue;

        let statementPoints = 0;
        const statementResults: any[] = [];

        for (const stmt of statements) {
          const userChoice = userAns?.[stmt.index];
          const stmtCorrect = userChoice === !!stmt.is_correct;
          
          if (userChoice !== undefined) {
            if (stmtCorrect) {
              statementPoints += q.positive_points || 0;
              obtained += q.positive_points || 0;
            } else {
              statementPoints -= Math.abs(q.negative_points || 0);
              obtained -= Math.abs(q.negative_points || 0);
            }
          }

          statementResults.push({
            index: stmt.index,
            text: stmt.text,
            is_correct: stmtCorrect,
            user_answer: userChoice,
            correct_answer: !!stmt.is_correct
          });
        }

        questionResults.push({
          question_id: q.question_id,
          type: q.type,
          is_correct: statementResults.every(s => s.is_correct),
          points_earned: statementPoints,
          max_points: points,
          statements: statementResults
        });
      }
    }

    obtained = Math.max(0, obtained); // prevent negative total if desired

    const attemptUuid = uuidv4();
    const normalizedTimeTaken =
      typeof time_taken === "number" && Number.isFinite(time_taken) && time_taken >= 0
        ? Math.floor(time_taken)
        : null;

    const [columnRows] = await db.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_attempts'`
    );

    const availableColumns = new Set((columnRows as any[]).map((r) => r.COLUMN_NAME));

    const requiredColumns = ["uuid", "quiz_uuid", "student_uuid", "score"];
    const missingRequired = requiredColumns.filter((col) => !availableColumns.has(col));
    if (missingRequired.length > 0) {
      return NextResponse.json(
        { error: `quiz_attempts table missing required columns: ${missingRequired.join(", ")}` },
        { status: 500 }
      );
    }

    const pointsColumn = availableColumns.has("total_points")
      ? "total_points"
      : availableColumns.has("total_possible")
      ? "total_possible"
      : null;

    if (!pointsColumn) {
      return NextResponse.json(
        { error: "quiz_attempts table missing required columns: total_points or total_possible" },
        { status: 500 }
      );
    }

    const insertColumns: string[] = ["uuid", "quiz_uuid", "student_uuid", "score", pointsColumn];
    const insertValues: any[] = [attemptUuid, quiz_uuid, student_uuid, obtained, max];
    const placeholders: string[] = ["?", "?", "?", "?", "?"];

    if (availableColumns.has("time_taken")) {
      insertColumns.push("time_taken");
      insertValues.push(normalizedTimeTaken);
      placeholders.push("?");
    }

    const answersColumn = availableColumns.has("answers_json")
      ? "answers_json"
      : availableColumns.has("answers")
      ? "answers"
      : availableColumns.has("answer_json")
      ? "answer_json"
      : null;

    if (answersColumn) {
      insertColumns.push(answersColumn);
      insertValues.push(JSON.stringify(answers));
      placeholders.push("?");
    }

    if (availableColumns.has("completed_at")) {
      insertColumns.push("completed_at");
      placeholders.push("NOW()");
    }

    await db.query(
      `INSERT INTO quiz_attempts (${insertColumns.join(", ")}) VALUES (${placeholders.join(", ")})`,
      insertValues
    );

    return NextResponse.json({ 
      score: { obtained, max },
      results: questionResults
    });
  } catch (err: any) {
    console.error("Quiz submission error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Server error",
        code: err?.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}