import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { sessionOptions } from "@/src/lib/session";

export async function POST(req: Request) {
  const { class_id } = await req.json();
  if (!class_id) {
    return new Response(JSON.stringify({ error: "Missing class_id" }), { status: 400 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, sessionOptions);
  
  session.selectedClassId = class_id;
  session.receipt_id = uuidv4();
  
  await session.save();

  return new Response(
    JSON.stringify({ ok: true, receipt_id: session.receipt_id }),
    { status: 200 }
  );
}