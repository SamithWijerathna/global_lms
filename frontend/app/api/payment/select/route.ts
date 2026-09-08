import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";

export async function POST(req: Request) {
  const { class_id, studypack_id, receipt_id } = await req.json();

  if (!class_id && !studypack_id) {
    return NextResponse.json(
      { error: "Either class_id or studypack_id is required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, sessionOptions);

  // Store the selected item(s) in session
  if (class_id) {
    session.selectedClassId = class_id;
  }
  if (studypack_id) {
    session.selectedStudypackId = studypack_id;
  }
  if (receipt_id) {
    session.receipt_id = receipt_id;
  }

  await session.save();

  return NextResponse.json({
    ok: true,
    redirect: "/dashboard/payment",
  });
}