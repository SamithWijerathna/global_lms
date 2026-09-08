import { getDBConnection } from "../db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const db = await getDBConnection();
  const [rows] = await db.query(
    "SELECT class_id, class_description, class_imageurl, class_title, class_price, class_type, renew_type, class_code, batch, create_at FROM class_list ORDER BY create_at DESC"
  );
  return NextResponse.json({ classes: rows });
}
