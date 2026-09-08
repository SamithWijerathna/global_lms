import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public", "uploads", "studypacks");

async function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const [packs] = await db.query(`
      SELECT *
      FROM studypack_list
      ORDER BY id ASC
    `);
    return NextResponse.json(packs);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch study packs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  await ensureUploadDir();

  const title = formData.get("studypack_title") as string;
  const description = formData.get("studypack_description") as string;
  const price = Number(formData.get("price"));
  const type = formData.get("studypack_type") as string;
  const code = formData.get("studypack_code") as string | null;
  const imageFile = formData.get("studypack_image") as File | null;

  try {

    const [rows] = await db.query("SELECT COUNT(*) AS count FROM studypack_list");
    const count = (rows as any)[0].count + 1;
    const studypackId = `ST_${count.toString().padStart(4, "0")}`;

    let imageUrl = null;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const ext = path.extname(imageFile.name) || ".jpg";
      const fileName = `${studypackId}${ext}`;
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
      imageUrl = `/uploads/studypacks/${fileName}`;
    }

    await db.query(
      `INSERT INTO studypack_list 
        (studypack_id, studypack_title, studypack_description, price, studypack_type, studypack_code, studypack_imageurl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studypackId, title, description, price, type, code || null, imageUrl]
    );

    return NextResponse.json({ success: true, studypack_id: studypackId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to add study pack" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  await ensureUploadDir();

  const id = Number(formData.get("id"));
  const title = formData.get("studypack_title") as string;
  const description = formData.get("studypack_description") as string;
  const price = Number(formData.get("price"));
  const type = formData.get("studypack_type") as string;
  const code = formData.get("studypack_code") as string | null;
  const imageFile = formData.get("studypack_image") as File | null;

  try {
    let imageUrl: string | null = null;

    if (imageFile && imageFile.size > 0) {

      const [rows] = await db.query("SELECT studypack_id FROM studypack_list WHERE id = ?", [id]);
      const studypackId = (rows as any)[0].studypack_id;

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const ext = path.extname(imageFile.name) || ".jpg";
      const fileName = `${studypackId}${ext}`;
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
      imageUrl = `/uploads/studypacks/${fileName}`;
    }

    await db.query(
      `UPDATE studypack_list 
       SET studypack_title = ?, studypack_description = ?, price = ?, studypack_type = ?, studypack_code = ?, studypack_imageurl = COALESCE(?, studypack_imageurl)
       WHERE id = ?`,
      [title, description, price, type, code || null, imageUrl, id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update study pack" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await db.query("DELETE FROM studypack_list WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete study pack" }, { status: 500 });
  }
}
