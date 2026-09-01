import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import { getDBConnection } from "../../../api/db";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);
   
    const classId = session.selectedClassId;
    const studypackId = session.selectedStudypackId;
    const itemId = classId || studypackId;
    
    if (!itemId) {
      return NextResponse.json(
        { error: "No class or study pack selected" },
        { status: 400 }
      );
    }

    const itemType = itemId.startsWith("CL") ? "class" : "studypack";
    
    const receipt_id = uuidv4();
    const formData = await req.formData();
    const file = formData.get("receipt") as File;
    const bank = formData.get("bank");
    const payment_type = formData.get("payment_type");
    const student_uuid = formData.get("student_uuid");
    const amount = formData.get("amount");

    if (!file) {
      return NextResponse.json(
        { error: "Missing receipt file" },
        { status: 400 }
      );
    }

    if (!bank || !student_uuid || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const filename = `${receipt_id}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const db = await getDBConnection();
    await db.query(
      `INSERT INTO payments
      (payment_uuid, student_uuid, amount, item_id, bank, transaction_proof, item_type, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        receipt_id,
        student_uuid,
        amount,
        itemId,
        bank,
        "uploads/receipts/" + filename,
        itemType,
        "pending",
      ]
    );

    session.receipt_id = receipt_id;
    await session.save();

    return NextResponse.json({
      success: true,
      receipt_id: receipt_id,
      item_type: itemType,
      item_id: itemId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload receipt" },
      { status: 500 }
    );
  }
}