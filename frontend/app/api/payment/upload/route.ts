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

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Receipt file size exceeds the 8MB limit. Please upload a smaller file." },
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

    const db = await getDBConnection(req);

    // Resolve all ID variants for this class / item
    let idVariants = [itemIdStr];
    if (itemType === "class") {
      try {
        const [clsRows]: any = await db.query(
          "SELECT id, class_id FROM class_list WHERE class_id = ? OR id = ? LIMIT 1",
          [itemIdStr, itemIdStr]
        );
        if (clsRows && clsRows.length > 0) {
          if (clsRows[0].class_id) idVariants.push(String(clsRows[0].class_id));
          if (clsRows[0].id) idVariants.push(String(clsRows[0].id));
        }
      } catch (err) {
        console.warn("Could not check class_list id variants:", err);
      }
    } else if (itemType === "studypack") {
      try {
        const [spRows]: any = await db.query(
          "SELECT id, studypack_id FROM studypack_list WHERE studypack_id = ? OR id = ? LIMIT 1",
          [itemIdStr, itemIdStr]
        );
        if (spRows && spRows.length > 0) {
          if (spRows[0].studypack_id) idVariants.push(String(spRows[0].studypack_id));
          if (spRows[0].id) idVariants.push(String(spRows[0].id));
        }
      } catch (err) {
        console.warn("Could not check studypack_list id variants:", err);
      }
    }
    idVariants = Array.from(new Set(idVariants));

    // Check for existing pending or approved payment to prevent duplicate payments
    const [existingPayments]: any = await db.query(
      `SELECT id, status, payment_uuid FROM payments 
       WHERE (student_uuid = ? OR student_uuid = (SELECT student_id FROM users WHERE uuid = ? LIMIT 1))
         AND item_type = ? 
         AND item_id IN (?) 
         AND status IN ('pending', 'approved') 
       ORDER BY created_at DESC LIMIT 1`,
      [student_uuid, student_uuid, itemType, idVariants]
    );

    if (existingPayments && existingPayments.length > 0) {
      const ex = existingPayments[0];
      if (ex.status === "approved") {
        return NextResponse.json(
          { error: "You are already enrolled in this class / item." },
          { status: 400 }
        );
      }
      if (ex.status === "pending") {
        return NextResponse.json(
          { error: "You already have a pending payment verification for this class / item. Please wait for admin approval." },
          { status: 400 }
        );
      }
    }

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