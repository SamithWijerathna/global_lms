import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../db";
import { promises as fs } from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public", "uploads", "papers");

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const [rows] = await db.query(
      "SELECT id, paper_id, paper_name, paper_cover_image FROM paper_predefine WHERE id = ?",
      [id]
    );
    return NextResponse.json(rows[0] || null);
  }

  const [rows] = await db.query(
    "SELECT id, paper_id, paper_name, paper_cover_image FROM paper_predefine ORDER BY id DESC"
  );
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "paper_predefine") {
      const paper_name = formData.get("paper_name") as string;
      const coverFile = formData.get("cover_image") as File | null;

      let coverFilename: string | null = null;

      const [insertResult]: any = await db.query(
        "INSERT INTO paper_predefine (paper_name, paper_cover_image) VALUES (?, NULL)",
        [paper_name]
      );
      const insertedId = insertResult.insertId;
      const paper_id = `PP_${insertedId.toString().padStart(4, "0")}`;

      if (coverFile && coverFile.size > 0) {
        const ext = path.extname(coverFile.name) || ".jpg";
        coverFilename = `${insertedId}${ext}`;
        const filePath = path.join(uploadDir, coverFilename);
        const bytes = await coverFile.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(bytes));
      }

      await db.query(
        "UPDATE paper_predefine SET paper_id = ?, paper_cover_image = ? WHERE id = ?",
        [paper_id, coverFilename, insertedId]
      );

      return NextResponse.json({ success: true, paper_id });
    }

    if (action === "edit_paper") {
      const id = formData.get("id") as string;
      const paper_name = formData.get("paper_name") as string;
      const coverFile = formData.get("cover_image") as File | null;

      let coverFilename: string | null = null;

      if (coverFile && coverFile.size > 0) {

        const [oldRows]: any = await db.query(
          "SELECT paper_cover_image FROM paper_predefine WHERE id = ?",
          [id]
        );
        const oldFile = oldRows[0]?.paper_cover_image;
        if (oldFile) {
          const oldPath = path.join(uploadDir, oldFile);
          try {
            await fs.unlink(oldPath);
          } catch {}
        }

        const ext = path.extname(coverFile.name) || ".jpg";
        coverFilename = `${id}${ext}`;
        const filePath = path.join(uploadDir, coverFilename);
        const bytes = await coverFile.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(bytes));
      }

      await db.query(
        "UPDATE paper_predefine SET paper_name = ?, paper_cover_image = COALESCE(?, paper_cover_image) WHERE id = ?",
        [paper_name, coverFilename, id]
      );

      return NextResponse.json({ success: true });
    }

    if (action === "add_mark") {
      const student_uuid = formData.get("student_uuid") as string;
      const paper_pr = formData.get("paper") as string;
      const mcqValue = formData.get("mark_mcq");
      const essayValue = formData.get("mark_essay");
      const mark_a = mcqValue ? parseFloat(mcqValue.toString()) : 0;
      const mark_b = essayValue ? parseFloat(essayValue.toString()) : 0;
      await db.query(
        "INSERT INTO students_marks (student_uuid, paper_id, mark_a, mark_b) VALUES (?, ?, ?, ?)",
        [student_uuid, paper_pr, mark_a, mark_b]
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

    const [rows]: any = await db.query("SELECT paper_cover_image FROM paper_predefine WHERE id = ?", [id]);
    const cover = rows[0]?.paper_cover_image;
    if (cover) {
      const filePath = path.join(uploadDir, cover);
      try {
        await fs.unlink(filePath);
      } catch {}
    }

    await db.query("DELETE FROM paper_predefine WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting paper:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}