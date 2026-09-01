import { NextResponse } from "next/server";
import { getDBConnection } from "../db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const quiz_uuid = searchParams.get("quiz_uuid");

    if (!quiz_uuid) {
      return NextResponse.json({ error: "quiz_uuid is required" }, { status: 400 });
    }

    const db = await getDBConnection();

    const [questions] = await db.query(`
      SELECT 
        q.uuid AS question_id,
        q.type,
        q.question_text,
        q.explanation,
        q.image_url,                    
        q.points,
        q.positive_points,
        q.negative_points,
        (
          SELECT COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'letter', o.letter,
                'text', o.text,
                'image_url', o.image_url,  
                'is_correct', o.is_correct
              )
            ), 
            JSON_ARRAY()
          )
          FROM question_options o 
          WHERE o.question_uuid = q.uuid 
          ORDER BY o.letter
        ) AS options,
        (
          SELECT COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT('index', s.index, 'text', s.text, 'is_correct', s.is_correct)
            ), 
            JSON_ARRAY()
          )
          FROM question_statements s 
          WHERE s.question_uuid = q.uuid 
          ORDER BY s.index
        ) AS statements
      FROM questions q
      WHERE q.quiz_uuid = ?
      ORDER BY q.create_at ASC
    `, [quiz_uuid]);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Error loading questions:", err);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}