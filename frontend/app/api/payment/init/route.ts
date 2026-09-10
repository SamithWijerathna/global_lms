import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { sessionOptions } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { class_id } = await req.json();
    if (!class_id) {
      return new Response(JSON.stringify({ error: "Missing class_id" }), { status: 400 });
    }

    const receipt_id = uuidv4();

    try {
      const cookieStore = await cookies();
      const session = await getIronSession(cookieStore, sessionOptions);
      
      session.selectedClassId = String(class_id);
      session.receipt_id = receipt_id;
      
      await session.save();
    } catch (sessionErr) {
      console.warn("Session save warning in /api/payment/init:", sessionErr);
    }

    return new Response(
      JSON.stringify({ ok: true, receipt_id }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/payment/init:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500 }
    );
  }
}