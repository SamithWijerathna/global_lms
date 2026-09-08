import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";
import bcrypt from "bcrypt";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const db = await getDBConnection();
  const [rows]: any = await db.query(
    `SELECT uuid, first_name, last_name, user_email, phone, batch, id_number, user_address
     FROM users
     WHERE setup_token = ? AND token_expiry > NOW()`,
    [token]
  );

  if (rows.length === 0)
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  return NextResponse.json({ success: true, user: rows[0] });
}

export async function POST(req: Request) {
  const {
    token,
    password,
    first_name,
    last_name,
    phone,
    batch,
    id_number,
    address,
  } = await req.json();

  if (!token || !password || password.length < 8)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const db = await getDBConnection();
  const [rows]: any = await db.query(
    `SELECT uuid FROM users WHERE setup_token = ? AND token_expiry > NOW()`,
    [token]
  );
  if (rows.length === 0)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);

  await db.query(
    `UPDATE users
     SET user_password = ?, first_name = ?, last_name = ?, phone = ?, batch = ?,
         id_number = ?, user_address = ?,
         setup_token = NULL, token_expiry = NULL, profile_completed = 1
     WHERE setup_token = ?`,
    [
      hashed,
      first_name,
      last_name,
      phone,
      batch,
      id_number,
      address,
      token,
    ]
  );

  return NextResponse.json({ success: true });
}