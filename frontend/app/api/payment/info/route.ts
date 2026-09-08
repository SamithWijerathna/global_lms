import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/src/lib/session";
import { getDBConnection } from "../../../api/db";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, sessionOptions);
  
  const itemId = session.selectedClassId || session.selectedStudypackId;
  
  if (!itemId) {
    return new Response(JSON.stringify({ error: "No class or study pack selected" }), {
      status: 400,
    });
  }

  try {
    const db = await getDBConnection();
    const isClass = itemId.startsWith("CL");
    const isStudyPack = itemId.startsWith("ST");

    if (!isClass && !isStudyPack) {
      return new Response(JSON.stringify({ error: "Invalid item ID format" }), {
        status: 400,
      });
    }

    let query, params, itemType;

    if (isClass) {
      query = "SELECT class_id AS item_id, class_title AS title, class_description AS description, class_price AS price FROM class_list WHERE class_id = ?";
      params = [itemId];
      itemType = "class";
    } else {
      query = "SELECT studypack_id AS item_id, studypack_title AS title, studypack_description AS description, price FROM studypack_list WHERE studypack_id = ?";
      params = [itemId];
      itemType = "studypack";
    }

    const [rows] = await db.query(query, params);

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: `${itemType} not found` }), {
        status: 404,
      });
    }

    const itemInfo = rows[0];

    return new Response(
      JSON.stringify({
        item_type: itemType,
        item_id: itemInfo.item_id,
        title: itemInfo.title,
        description: itemInfo.description,
        price: itemInfo.price,
        receipt_id: session.receipt_id,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Database error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch item info" }), {
      status: 500,
    });
  }
}