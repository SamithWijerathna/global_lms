import { NextResponse } from "next/server";
import { getDBConnection } from "../db";

export async function GET() {
  const db = await getDBConnection();
  const [rows] = await db.query(
    "SELECT id, paper_id, paper_name FROM paper_predefine ORDER BY id DESC"
  );
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  try {
    const db = await getDBConnection();
    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "paper_predefine") {
      const paper_name = formData.get("paper_name") as string;

      const [insertResult]: any = await db.query(
        "INSERT INTO paper_predefine (paper_name) VALUES (?)",
        [paper_name]
      );

      const insertedId = insertResult.insertId;
      const paper_id = `PP_${insertedId.toString().padStart(4, "0")}`;

      await db.query("UPDATE paper_predefine SET paper_id = ? WHERE id = ?", [
        paper_id,
        insertedId,
      ]);

      return NextResponse.json({ success: true, paper_id });
    }

    if (action === "edit_paper") {
      const id = formData.get("id") as string;
      const paper_name = formData.get("paper_name") as string;

      await db.query("UPDATE paper_predefine SET paper_name = ? WHERE id = ?", [
        paper_name,
        id,
      ]);

      return NextResponse.json({ success: true });
    }
    if (action === "add_mark"){
      const student_uuuid = formData.get("student_uuuid") as string;
      const paper_pr = formData.get("paper") as string;
      const mcqValue = formData.get("mark_mcq");
      const essayValue = formData.get("mark_essay");

      const mark_a = mcqValue ? parseFloat(mcqValue.toString()) : 0;
      const mark_b = essayValue ? parseFloat(essayValue.toString()) : 0;

      await db.query("INSERT INTO  students_marks (student_uuid, 	paper_id, 	mark_a ,	mark_b) VALUE (?, ?, ?, ?)",[student_uuuid, paper_pr, mark_a, mark_b]);
      return NextResponse.json({success: true});
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = await getDBConnection();
    await db.query("DELETE FROM paper_predefine WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting paper:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
