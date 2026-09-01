import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split("; ")
      .map((c) => c.split("=").map((part) => decodeURIComponent(part)))
  );

  const session = cookies["userdata"];

  if (!session) {
    return NextResponse.json({ userdata: null, valid: false });
  }

  try {
    const userData = JSON.parse(session);
    return NextResponse.json({ userdata: userData, valid: true });
  } catch (err) {
    console.error("Invalid session data:", err);
    return NextResponse.json({ userdata: null, valid: false });
  }
}
