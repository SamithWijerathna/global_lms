import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import fetch from "node-fetch";

export async function GET(req: Request) {
  const db = await getDBConnection();
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const res = await fetch("https://server2.cloudwave.asia:8083/api/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      hash: `${process.env.HESTIA_KEY}:${process.env.HESTIA_SECRET}`,
      cmd: "v-list-user",
      arg1: `${process.env.HESTIA_USER}`,
      arg2: "json",
    }),
  });

  const data = await res.json();
  const user = data.lashinigeo;

  return NextResponse.json({
    totalMB: Number(user.DISK_QUOTA),
    usedMB: Number(user.U_DISK),

  });
}
