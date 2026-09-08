import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }
  
  // Get the URL and extract query parameters
  const { searchParams } = new URL(req.url);
  const class_id = searchParams.get('class_id');
  
  // If class_id is provided, get that specific class
  if (class_id) {
    const [rows] = await db.query(
      "SELECT * FROM class_list WHERE class_id = ?",
      [class_id]
    );
    return NextResponse.json(rows);
  }
  
  // Otherwise, return all classes
  const [rows] = await db.query("SELECT * FROM class_list ORDER BY display_order ASC, id DESC");
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  const class_title = formData.get("class_title") as string;
  const class_description = formData.get("class_description") as string;
  const class_price = formData.get("class_price") as string;
  const class_type = formData.get("class_type") as string;
  const renew_type = formData.get("renew_type") as string;
  const batch = formData.get("batch") as string;
  const class_code = formData.get("class_code") as string | null;
  const image = formData.get("class_image") as File | null;

    const [result] = await db.query(
      `INSERT INTO class_list
      (class_title, class_description, class_price, class_type, renew_type, batch, class_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [class_title, class_description, class_price, class_type, renew_type, batch, class_code]
    );

    const insertedId = (result as any).insertId;

    const class_id = `CL${insertedId.toString().padStart(4, "0")}`;

    let class_imageurl = null;
    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const ext = path.extname(image.name) || ".jpg";
      const fileName = `${class_id}${ext}`;
      
      fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
      class_imageurl = `/uploads/${fileName}`;
    }

    await db.query(
      `UPDATE class_list 
      SET class_id = ?, class_imageurl = ?
      WHERE id = ?`,
      [class_id, class_imageurl, insertedId]
    );


  return NextResponse.json({ success: true, class_id, class_imageurl });
}

export async function PUT(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const formData = await req.formData();
  const id = formData.get("class_id") as string;
  const class_title = formData.get("class_title") as string;
  const class_description = formData.get("class_description") as string;
  const class_price = formData.get("class_price") as string;
  const class_type = formData.get("class_type") as string;
  const renew_type = formData.get("renew_type") as string;
  const batch = formData.get("batch") as string;
  const class_code = formData.get("class_code") as string | null;
  const image = formData.get("class_image") as File | null;

  const [existingRows] = await db.query("SELECT class_id, class_imageurl FROM class_list WHERE class_id = ?", [id]);
  if ((existingRows as any).length === 0) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const class_id = (existingRows as any)[0].class_id;
  let class_imageurl = (existingRows as any)[0].class_imageurl;

  if (image && image.size > 0) {
    const buffer = Buffer.from(await image.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "classes");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(image.name) || ".jpg";
    const fileName = `${class_id}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
    class_imageurl = `/uploads/classes/${fileName}`;
  }

  await db.query(
    `UPDATE class_list SET class_title=?, class_description=?, class_price=?, class_type=?, renew_type=?, batch=?, class_code=?, class_imageurl=? WHERE class_id=?`,
    [class_title, class_description, class_price, class_type, renew_type, batch, class_code, class_imageurl, id]
  );

  return NextResponse.json({ success: true, class_imageurl });
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [rows] = await db.query("SELECT class_imageurl FROM class_list WHERE id = ?", [id]);
  const class_imageurl = (rows as any)[0]?.class_imageurl;
  if (class_imageurl) {
    const filePath = path.join(process.cwd(), "public", class_imageurl.replace("/uploads/", "uploads/"));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await db.query("DELETE FROM class_list WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
