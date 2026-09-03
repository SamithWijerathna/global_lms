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
      ? "SELECT * FROM batches ORDER BY id ASC"
      : "SELECT * FROM batches WHERE is_active = 1 ORDER BY id ASC";

    const [rows] = await db.query(sql);
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET batches error:", err);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
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
        batch_code: formData.get("batch_code"),
        batch_name: formData.get("batch_name"),
        description: formData.get("description"),
      };
    } else {
      body = await req.json();
    }

    const { batch_code, batch_name, description } = body;

    if (!batch_code || !batch_name) {
      return NextResponse.json({ error: "Batch code and batch name are required" }, { status: 400 });
    }

    const cleanCode = String(batch_code).trim();
    const cleanName = String(batch_name).trim();

    const [existing]: any = await db.query("SELECT id FROM batches WHERE batch_code = ?", [cleanCode]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Batch code already exists" }, { status: 400 });
    }

    const [result]: any = await db.query(
      "INSERT INTO batches (batch_code, batch_name, description, is_active) VALUES (?, ?, ?, 1)",
      [cleanCode, cleanName, description || null]
    );

    return NextResponse.json({ success: true, id: result.insertId, batch_code: cleanCode, batch_name: cleanName });
  } catch (err: any) {
    console.error("POST batch error:", err);
    return NextResponse.json({ error: err.message || "Failed to create batch" }, { status: 500 });
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
        batch_code: formData.get("batch_code"),
        batch_name: formData.get("batch_name"),
        description: formData.get("description"),
        is_active: formData.get("is_active") === "true" || formData.get("is_active") === "1" ? 1 : 0,
      };
    } else {
      body = await req.json();
    }

    const { id, batch_code, batch_name, description, is_active = 1 } = body;

    if (!id || !batch_code || !batch_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanCode = String(batch_code).trim();
    const cleanName = String(batch_name).trim();

    await db.query(
      "UPDATE batches SET batch_code = ?, batch_name = ?, description = ?, is_active = ? WHERE id = ?",
      [cleanCode, cleanName, description || null, is_active ? 1 : 0, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT batch error:", err);
    return NextResponse.json({ error: err.message || "Failed to update batch" }, { status: 500 });
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

    await db.query("DELETE FROM batches WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE batch error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete batch" }, { status: 500 });
  }
}
