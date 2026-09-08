import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import { PERMISSIONS, MODULES } from "@/constants/permissions";

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const [roles] = await db.query("SELECT * FROM permission");
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const body = await req.json();
  const { id, role_name, data } = body;

  if (id) {

    await db.query("UPDATE permission SET role_name = ?, data = ? WHERE id = ?", [
      role_name,
      JSON.stringify(data),
      id,
    ]);
  } else {

    await db.query("INSERT INTO permission (role_name, data) VALUES (?, ?)", [
      role_name,
      JSON.stringify(data),
    ]);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.query("DELETE FROM permission WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
