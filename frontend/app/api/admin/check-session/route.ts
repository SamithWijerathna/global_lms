import { NextResponse } from "next/server";

export async function GET(req: Request) {

  const cookieStore = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieStore.split("; ").map((c) => c.split("="))
  );

  const session = cookies["admin_session"];

  if (!session) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true });
}
