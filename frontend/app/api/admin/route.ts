import { NextResponse } from "next/server";
import { getDBConnection, authorize, getTenantMeta } from "../db";
import { getTenantLocalStorageUsage } from "@/lib/localStorageManager";
import { getTenantR2StorageUsage } from "@/lib/r2StorageManager";

export async function GET(req: Request) {
  try {
    const meta = await getTenantMeta(req);
    const db = await getDBConnection(meta.dbName);
    /* ---------------- AUTH ---------------- */
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    /* ---------------- COUNTS ---------------- */
    const [[{ classes }]] = await db.query<{ classes: number }[]>(
      "SELECT COUNT(*) AS classes FROM class_list"
    );
    const [[{ users }]] = await db.query<{ users: number }[]>(
      "SELECT COUNT(*) AS users FROM users"
    );
    const [[{ total }]] = await db.query<{ total: number }[]>(
      "SELECT COUNT(*) AS total FROM payments"
    );
    const [[{ pending }]] = await db.query<{ pending: number }[]>(
      "SELECT COUNT(*) AS pending FROM payments WHERE status = 'pending'"
    );
    const [[{ approved }]] = await db.query<{ approved: number }[]>(
      "SELECT COUNT(*) AS approved FROM payments WHERE status = 'approved'"
    );
    const [[{ approved_total }]] = await db.query<{ approved_total: number }[]>(
      "SELECT SUM(amount) AS approved_total FROM payments WHERE status = 'approved'"
    );

    /* ---------------- RECENT DATA ---------------- */
    const [recentUsers] = await db.query(
      `SELECT 
         id, 
         uuid, 
         student_id, 
         CONCAT(first_name, ' ', last_name) AS name, 
         user_email AS email, 
         create_at 
       FROM users 
       ORDER BY create_at DESC 
       LIMIT 10`
    );

    const [recentPayments] = await db.query(
      `SELECT 
         p.id,
         p.payment_uuid,
         p.amount,
         p.status,
         p.created_at,
         p.approved_at,
         CONCAT(u.first_name, ' ', u.last_name) AS student_name,
         u.student_id,
         c.class_title
       FROM payments p
       LEFT JOIN users u ON p.student_uuid = u.uuid
       LEFT JOIN class_list c ON p.item_id = c.class_id
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    const [pendingPayments] = await db.query(
      `SELECT 
         p.id,
         p.payment_uuid,
         p.amount,
         p.created_at,
         CONCAT(u.first_name, ' ', u.last_name) AS student_name,
         u.student_id,
         c.class_title,
         p.transaction_proof
       FROM payments p
       LEFT JOIN users u ON p.student_uuid = u.uuid
       LEFT JOIN class_list c ON p.item_id = c.class_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );

    //  const res = await fetch("https://server2.cloudwave.asia:8083/api/", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
    //     body: new URLSearchParams({
    //       hash: `${process.env.HESTIA_KEY}:${process.env.HESTIA_SECRET}`,
    //       cmd: "v-list-user",
    //       arg1: `${process.env.HESTIA_USER}`,
    //       arg2: "json",
    //     }),
    //   });
    //     const data = await res.json();
    
    const localUsage = getTenantLocalStorageUsage(meta.tenantId, meta.maxStorageMb);
    const mediaUsage = await getTenantR2StorageUsage(meta.tenantId, meta.maxMediaStorageGb);

    return NextResponse.json({
      storage: {
        totalMB: localUsage.totalMB,
        usedMB: localUsage.usedMB,
        local: localUsage,
        media: mediaUsage,
      },
      classes,
      users,
      payments: {
        total,
        pending,
        approved,
        approved_total,
      },
      recentUsers,
      recentPayments,
      pendingPayments,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}