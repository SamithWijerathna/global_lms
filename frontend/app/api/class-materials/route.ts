import { getDBConnection } from "../db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const db = await getDBConnection();
  const [rows] = await db.query(
    "SELECT * FROM class_material_list ORDER BY id DESC"
  );
  return NextResponse.json({ materials: rows });
}
