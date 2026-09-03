import { NextResponse } from "next/server";
import { getDBConnection } from "../../db";
import { healDatabase } from "../../dbHealer";

export async function GET() {
  try {
    const pool = getDBConnection();
    const result = await healDatabase(pool, true);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const pool = getDBConnection();
    const result = await healDatabase(pool, true);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
