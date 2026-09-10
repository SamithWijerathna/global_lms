import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import { getDBConnection, getTenantMeta } from "../../../api/db";
import { saveTenantLocalFile } from "@/lib/localStorageManager";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("receipt") as File;
    const bank = formData.get("bank");
    const payment_type = formData.get("payment_type");
    const student_uuid = formData.get("student_uuid");
    const amount = formData.get("amount");

    // Support item_id / class_id / studypack_id directly from formData or fallback to session
    const formItemId = (formData.get("item_id") || formData.get("class_id") || formData.get("studypack_id")) as string | null;
    let itemId = formItemId;

    let session: any = null;
    try {
      const cookieStore = await cookies();
      session = await getIronSession(cookieStore, sessionOptions);
      if (!itemId) {
        itemId = session.selectedClassId || session.selectedStudypackId;
      }
    } catch (sessionErr) {
      console.warn("Session read warning in /api/payment/upload:", sessionErr);
    }
    
    if (!itemId) {
      return NextResponse.json(
        { error: "No class or study pack selected" },
        { status: 400 }
      );
    }

    const itemIdStr = String(itemId);
    const itemType = itemIdStr.startsWith("CL") ? "class" : itemIdStr.startsWith("ST") ? "studypack" : ((payment_type as string) || "class");
    
    const receipt_id = uuidv4();

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
    const buffer = Buffer.from(await file.arrayBuffer());

    const meta = await getTenantMeta(req);
    let saveResult;
    try {
      saveResult = await saveTenantLocalFile({
        tenantId: meta.tenantId,
        category: "receipts",
        fileBuffer: buffer,
        originalFileName: file.name,
        maxStorageMb: meta.maxStorageMb,
      });
    } catch (quotaErr: any) {
      return NextResponse.json(
        { error: quotaErr.message || "Storage quota exceeded" },
        { status: 413 }
      );
    }

    const db = await getDBConnection();
    await db.query(
      `INSERT INTO payments
      (payment_uuid, student_uuid, amount, item_id, bank, transaction_proof, item_type, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        receipt_id,
        student_uuid,
        amount,
        itemIdStr,
        bank,
        saveResult.relativeUrl,
        itemType,
        "pending",
      ]
    );

    if (session) {
      try {
        session.receipt_id = receipt_id;
        await session.save();
      } catch (saveErr) {
        console.warn("Session save warning in /api/payment/upload:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      receipt_id: receipt_id,
      item_type: itemType,
      item_id: itemIdStr,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload receipt" },
      { status: 500 }
    );
  }
}