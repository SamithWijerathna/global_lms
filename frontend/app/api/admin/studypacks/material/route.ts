import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../../db";
import { promises as fs } from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public", "uploads", "studypacks");

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const url = new URL(req.url);
  const studypackId = url.searchParams.get("studypack_id");

  try {
    if (studypackId) {

      const [materials] = await db.query(
        "SELECT * FROM studypack_material_list WHERE studypack_id = ?",
        [studypackId]
      );
      return NextResponse.json(materials); 
    } else {

      const [packs] = await db.query(`
        SELECT 
          s.studypack_id,
          s.studypack_title,
          s.studypack_description,
          s.price,
          COUNT(m.material_id) AS material_count
        FROM studypack_list s
        LEFT JOIN studypack_material_list m ON s.studypack_id = m.studypack_id
        GROUP BY 
          s.studypack_id,
          s.studypack_title,
          s.studypack_description,
          s.price
      `);
      return NextResponse.json(packs);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
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

  const materialTitle = formData.get("material_title") as string;
  const materialDescription = formData.get("material_description") as string;
  const materialType = formData.get("material_type") as string;
  const studypackId = formData.get("studypack_id") as string;
  const materialLink = formData.get("material_link") as string | null;

  const videoFile = formData.get("material_video") as File | null;
  const pdfFile = formData.get("material_pdf") as File | null;
  const coverImage = formData.get("material_image") as File | null;

  try {

    const [rows] = await db.query("SELECT COUNT(*) AS count FROM studypack_material_list");
    const count = (rows as any)[0].count + 1;
    const materialId = `SPMT${count.toString().padStart(4, "0")}`;

    await db.query(
      `INSERT INTO studypack_material_list 
      (material_id, material_title, material_description, material_type, material_link, studypack_id) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [materialId, materialTitle, materialDescription, materialType, materialLink || null, studypackId]
    );

    let imageUrl = null;
    if (coverImage && coverImage.size > 0) {
      const buffer = Buffer.from(await coverImage.arrayBuffer());
      const ext = path.extname(coverImage.name) || ".jpg";
      const fileName = `${materialId}${ext}`;
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      imageUrl = `/uploads/studypacks/${fileName}`;

      await db.query(
        "UPDATE studypack_material_list SET material_imageurl = ? WHERE material_id = ?",
        [imageUrl, materialId]
      );
    }

    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      const ext = path.extname(videoFile.name) || ".mp4";
      const fileName = `${materialId}_1${ext}`;
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      await db.query(
        "UPDATE studypack_material_list SET material_video_url = ? WHERE material_id = ?",
        [`/uploads/studypacks/${fileName}`, materialId]
      );
    }

    if (pdfFile && pdfFile.size > 0) {
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      const ext = path.extname(pdfFile.name) || ".pdf";
      const fileName = `${materialId}_2${ext}`;
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      await db.query(
        "UPDATE studypack_material_list SET material_pdf_url = ? WHERE material_id = ?",
        [`/uploads/studypacks/${fileName}`, materialId]
      );
    }

    return NextResponse.json({ success: true, material_id: materialId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to add material" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  await ensureUploadDir();

  const materialId = formData.get("material_id") as string;
  const materialTitle = formData.get("material_title") as string;
  const materialDescription = formData.get("material_description") as string;
  const materialType = formData.get("material_type") as string;
  const materialLink = formData.get("material_link") as string | null;

  const videoFile = formData.get("material_video") as File | null;
  const pdfFile = formData.get("material_pdf") as File | null;
  const coverImage = formData.get("material_image") as File | null;

  try {
    await db.query(
      `UPDATE studypack_material_list SET 
      material_title = ?, material_description = ?, material_type = ?, material_link = ? 
      WHERE material_id = ?`,
      [materialTitle, materialDescription, materialType, materialLink || null, materialId]
    );

    if (coverImage && coverImage.size > 0) {
      const buffer = Buffer.from(await coverImage.arrayBuffer());
      const ext = path.extname(coverImage.name) || ".jpg";
      const fileName = `${materialId}${ext}`;
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      const imageUrl = `/uploads/studypacks/${fileName}`;
      await db.query(
        "UPDATE studypack_material_list SET material_imageurl = ? WHERE material_id = ?",
        [imageUrl, materialId]
      );
    }

    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      const ext = path.extname(videoFile.name) || ".mp4";
      const fileName = `${materialId}_1${ext}`;
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      await db.query(
        "UPDATE studypack_material_list SET material_video_url = ? WHERE material_id = ?",
        [`/uploads/studypacks/${fileName}`, materialId]
      );
    }

    if (pdfFile && pdfFile.size > 0) {
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      const ext = path.extname(pdfFile.name) || ".pdf";
      const fileName = `${materialId}_2${ext}`;
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      await db.query(
        "UPDATE studypack_material_list SET material_pdf_url = ? WHERE material_id = ?",
        [`/uploads/studypacks/${fileName}`, materialId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const url = new URL(req.url);
  const materialId = url.searchParams.get("material_id");

  if (!materialId) {
    return NextResponse.json({ error: "Missing material_id" }, { status: 400 });
  }

  try {
    await db.query("DELETE FROM studypack_material_list WHERE material_id = ?", [materialId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
