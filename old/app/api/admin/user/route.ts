import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  if (action === "userList") {

    const cookieHeader = req.headers.get("cookie") || "";
    const cookiesObj = Object.fromEntries(cookieHeader.split("; ").map((c) => c.split("=")));
    if (!cookiesObj["admin_session"]) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
      const db = await getDBConnection();
      const [rows] = await db.query(
        "SELECT uuid, first_name, last_name, user_email, role, permission_id, create_at FROM admin_users"
      );

      const users = (rows as any[]).map((u) => ({
        uuid: u.uuid,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.user_email,
        role: u.role,
        permission_id: u.permission_id,
        created_at: u.create_at,
      }));

      return NextResponse.json({ users });
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
