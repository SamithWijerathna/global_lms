import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "quizzes");

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function POST(req: Request) {
  try {
    await ensureDir();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const handle = await fs.open(filepath, "w");
    await handle.write(buffer, 0, buffer.length);
    await handle.close();

    const url = `/uploads/quizzes/${filename}`;
    return NextResponse.json({ url, filename });

  } catch (err: any) {
    console.error("[QUIZ UPLOAD] Error:", err);
    return NextResponse.json({ error: "Upload failed", detail: err.message }, { status: 500 });
  }
}