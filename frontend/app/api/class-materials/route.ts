import { getDBConnection } from "../db";
import { resolveMediaUrl } from "@/lib/r2StorageManager";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const db = await getDBConnection(req);
  const [rows]: any = await db.query(
    "SELECT * FROM class_material_list ORDER BY id DESC"
  );
  const materials = Array.isArray(rows)
    ? rows.map((r: any) => ({
        ...r,
        material_video_url: resolveMediaUrl(r.material_video_url),
        material_pdf_url: resolveMediaUrl(r.material_pdf_url),
        material_imageurl: resolveMediaUrl(r.material_imageurl),
      }))
    : [];
  return NextResponse.json({ materials });
}
