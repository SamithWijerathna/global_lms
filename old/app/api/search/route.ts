import { NextRequest, NextResponse } from "next/server";
import { getDBConnection } from "../db";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const db = await getDBConnection();
  
  try {
    // Get search query
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    
    if (!query || query.length < 2) {
      return NextResponse.json({ classes: [], materials: [] });
    }

    // Get student_uuid from JWT
    let accessToken;
    if (typeof (req as any).cookies?.get === "function") {
      accessToken = (req as any).cookies.get("accessToken")?.value;
    } else {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/accessToken=([^;]+)/);
        if (match) accessToken = match[1];
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "your-secret-key");
    const student_uuid = (decoded as any).uuid;

    console.log('Search API - student_uuid:', student_uuid, 'query:', query);

    // Debug: Check enrollment via payments (not students_marks)
    const [paymentCheck]: any = await db.query(
      `SELECT COUNT(*) as count FROM payments WHERE student_uuid = ? AND status = 'approved' AND item_type = 'class'`,
      [student_uuid]
    );
    console.log('Search API - approved class payments count:', paymentCheck[0]?.count || 0);

    // Search for classes student has approved payments for
    const [classRows]: any = await db.query(
      `SELECT DISTINCT cl.class_id, cl.class_title, cl.batch, cl.class_description
       FROM class_list cl
       JOIN payments p ON cl.class_id = p.item_id
       WHERE p.student_uuid = ?
       AND p.status = 'approved'
       AND p.item_type = 'class'
       AND (
         cl.class_title LIKE ? OR 
         cl.batch LIKE ? OR 
         cl.class_description LIKE ?
       )
       ORDER BY cl.create_at DESC
       LIMIT 10`,
      [student_uuid, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    console.log('Search API - classRows found:', classRows?.length || 0);

    // Search for materials in classes where student has approved payments
    const [materialRows]: any = await db.query(
      `SELECT DISTINCT 
         cml.material_id,
         cml.material_title,
         cml.material_description,
         cml.material_type,
         cml.class_id,
         cl.class_title
       FROM class_material_list cml
       JOIN class_list cl ON cml.class_id = cl.class_id
       JOIN payments p ON cl.class_id = p.item_id
       WHERE p.student_uuid = ?
       AND p.status = 'approved'
       AND p.item_type = 'class'
       AND (
         cml.material_title LIKE ? OR 
         cml.material_description LIKE ? OR
         cl.class_title LIKE ?
       )
       ORDER BY cml.create_at DESC
       LIMIT 10`,
      [student_uuid, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    console.log('Search API - materialRows found:', materialRows?.length || 0);
    console.log('Search API - returning results:', { classes: classRows?.length, materials: materialRows?.length });

    return NextResponse.json({
      classes: classRows || [],
      materials: materialRows || []
    });

  } catch (error) {
    console.error("Search error:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Search error details:", errorMsg);
    return NextResponse.json({ error: "Internal server error", details: errorMsg }, { status: 500 });
  }
}
