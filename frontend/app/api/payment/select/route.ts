import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { class_id, studypack_id, receipt_id } = body;

    if (!class_id && !studypack_id) {
      return NextResponse.json(
        { error: "Either class_id or studypack_id is required" },
        { status: 400 }
      );
    }

    try {
      const cookieStore = await cookies();
      const session = await getIronSession(cookieStore, sessionOptions);

      // Store the selected item(s) in session
      if (class_id) {
        session.selectedClassId = String(class_id);
      }
      if (studypack_id) {
        session.selectedStudypackId = String(studypack_id);
      }
      if (receipt_id) {
        session.receipt_id = String(receipt_id);
      }

      await session.save();
    } catch (sessionErr) {
      console.warn("Session save warning in /api/payment/select:", sessionErr);
    }

    return NextResponse.json({
      ok: true,
      redirect: "/dashboard/payment",
    });
  } catch (error: any) {
    console.error("Error in /api/payment/select:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to select class for payment" },
      { status: 500 }
    );
  }
}