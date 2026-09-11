import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { optimizeImageToWebP, validateImageUploadSize } from "@/lib/imageOptimizer";

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

    try {
      validateImageUploadSize(file.size);
    } catch (sizeErr: any) {
      return NextResponse.json({ error: sizeErr.message || "File too large (max 8MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImageToWebP(buffer, file.name, { category: "general" });
    const filename = `${Date.now()}-${uuidv4()}${optimized.ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const handle = await fs.open(filepath, "w");
    await handle.write(optimized.buffer, 0, optimized.buffer.length);
    await handle.close();

    const url = `/uploads/quizzes/${filename}`;
    return NextResponse.json({ url, filename });

  } catch (err: any) {
    console.error("[QUIZ UPLOAD] Error:", err);
    return NextResponse.json({ error: "Upload failed", detail: err.message }, { status: 500 });
  }
}