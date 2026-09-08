import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../db";
import { healDatabase } from "../dbHealer";

export async function GET(req: Request) {
  try {
    const db = await getDBConnection();
    await healDatabase(db);

    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("all") === "true";

    const sql = includeAll
      ? "SELECT * FROM class_types ORDER BY id ASC"
      : "SELECT * FROM class_types WHERE is_active = 1 ORDER BY id ASC";

    const [rows] = await db.query(sql);
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET class_types error:", err);
    return NextResponse.json({ error: "Failed to fetch class types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDBConnection();
    await healDatabase(db);

    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {
        type_code: formData.get("type_code"),
        type_name: formData.get("type_name"),
        description: formData.get("description"),
      };
    } else {
      body = await req.json();
    }

    const { type_code, type_name, description } = body;

    if (!type_code || !type_name) {
      return NextResponse.json({ error: "Type code and Type name are required" }, { status: 400 });
    }

    const cleanCode = String(type_code).trim();
    const cleanName = String(type_name).trim();

    const [existing]: any = await db.query("SELECT id FROM class_types WHERE type_code = ?", [cleanCode]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Class type code already exists" }, { status: 400 });
    }

    const [result]: any = await db.query(
      "INSERT INTO class_types (type_code, type_name, description, is_active) VALUES (?, ?, ?, 1)",
      [cleanCode, cleanName, description || null]
    );

    return NextResponse.json({ success: true, id: result.insertId, type_code: cleanCode, type_name: cleanName });
  } catch (err: any) {
    console.error("POST class_type error:", err);
    return NextResponse.json({ error: err.message || "Failed to create class type" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDBConnection();
    await healDatabase(db);

    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {
        id: formData.get("id"),
        type_code: formData.get("type_code"),
        type_name: formData.get("type_name"),
        description: formData.get("description"),
        is_active: formData.get("is_active") === "true" || formData.get("is_active") === "1" ? 1 : 0,
      };
    } else {
      body = await req.json();
    }

    const { id, type_code, type_name, description, is_active = 1 } = body;

    if (!id || !type_code || !type_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanCode = String(type_code).trim();
    const cleanName = String(type_name).trim();

    await db.query(
      "UPDATE class_types SET type_code = ?, type_name = ?, description = ?, is_active = ? WHERE id = ?",
      [cleanCode, cleanName, description || null, is_active ? 1 : 0, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT class_type error:", err);
    return NextResponse.json({ error: err.message || "Failed to update class type" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const db = await getDBConnection();
    await healDatabase(db);

    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await db.query("DELETE FROM class_types WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE class_type error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete class type" }, { status: 500 });
  }
}
