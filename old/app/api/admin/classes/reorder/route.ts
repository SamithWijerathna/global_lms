import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../../db";

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  try {
    const body = await req.json();
    const items = body.items || body.class_orders; // Array of { class_id, display_order } or Array of class_ids in order

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data format. Expected items array." }, { status: 400 });
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (typeof item === "string") {
        await db.query("UPDATE class_list SET display_order = ? WHERE class_id = ?", [index, item]);
      } else if (item.class_id) {
        const order = typeof item.display_order === "number" ? item.display_order : index;
        await db.query("UPDATE class_list SET display_order = ? WHERE class_id = ?", [order, item.class_id]);
      }
    }

    return NextResponse.json({ success: true, message: "Class order updated successfully" });
  } catch (err: any) {
    console.error("Error reordering classes:", err);
    return NextResponse.json({ error: "Failed to reorder classes" }, { status: 500 });
  }
}
