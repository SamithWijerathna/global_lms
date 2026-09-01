// app/api/payment/route.ts
import { NextResponse } from "next/server";
import { getDBConnection } from "../../api/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const db = await getDBConnection();

    // -------------------------------------------------
    // 1. Get a user’s payments
    // -------------------------------------------------
    if (action === "user_payments") {
      const { student_uuid } = data;
      if (!student_uuid) {
        return NextResponse.json({ error: "Missing student_uuid" }, { status: 400 });
      }

      const [rows] = await db.query(
        "SELECT * FROM payments WHERE student_uuid = ? ORDER BY created_at DESC",
        [student_uuid]
      );
      const user_payments = rows as any[];

      if (!user_payments || user_payments.length === 0) {
        return NextResponse.json({ error: "NO PAYMENT DATA FOUND" }, { status: 404 });
      }

      return NextResponse.json(user_payments, { status: 200 });
    }

    // -------------------------------------------------
    // 2. Pending payments (admin view)
    // -------------------------------------------------
    if (action === "pending_payments") {
       const [rows] = await db.query(`
    SELECT 
      p.*,
      c.class_title,
      sp.studypack_title
    FROM payments p
    LEFT JOIN class_list c ON p.item_type = 'class' AND p.item_id = c.class_id
    LEFT JOIN studypack_list sp ON p.item_type = 'studypack' AND p.item_id = sp.studypack_id
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC
  `);
      const payments = rows as any[];

      if (!payments || payments.length === 0) {
        return NextResponse.json({ error: "No pending payments found" }, { status: 404 });
      }

      return NextResponse.json({ payments }, { status: 200 });
    }

    // -------------------------------------------------
    // 3. Approve a payment
    // -------------------------------------------------
    if (action === "complete_payment") {
      const { payment_uuid } = data;
      if (!payment_uuid) {
        return NextResponse.json({ error: "Missing payment_uuid" }, { status: 400 });
      }

      await db.query(
        "UPDATE payments SET status = ?, approved_at = NOW() WHERE payment_uuid = ?",
        ["approved", payment_uuid]
      );

      return NextResponse.json({ message: "Payment marked as completed" }, { status: 200 });
    }

    // -------------------------------------------------
    // 4. Reject a payment
    // -------------------------------------------------
    if (action === "reject") {
      const { payment_uuid } = data;
      if (!payment_uuid) {
        return NextResponse.json({ error: "Missing payment_uuid" }, { status: 400 });
      }

      await db.query(
        "UPDATE payments SET status = ?, approved_at = NOW() WHERE payment_uuid = ?",
        ["reject", payment_uuid]
      );

      return NextResponse.json({ message: "Payment rejected" }, { status: 200 });
    }

    // -------------------------------------------------
    // 5. Fallback for unknown actions
    // -------------------------------------------------
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in payment handler:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* --------------------------------------------------------------------- */
/*  GET – fetch ALL payments (used by the MonthlyPayments dashboard)    */
/* --------------------------------------------------------------------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");

  const db = await getDBConnection();

  if (all) {
    const [rows] = await db.query(`
      SELECT * 
      FROM payments 
      ORDER BY created_at DESC
    `);
    return NextResponse.json({ payments: rows });
  }

  // If no `all` param → you can keep the old pending-only behaviour
  const [rows] = await db.query("SELECT * FROM payments WHERE status = ?", ["pending"]);
  const payments = rows as any[];
  return NextResponse.json({ payments });
}

/* --------------------------------------------------------------------- */
/*  DELETE – permanently remove a payment (admin only)                 */
/* --------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { payment_uuid } = body;

    if (!payment_uuid) {
      return NextResponse.json({ error: "Missing payment_uuid" }, { status: 400 });
    }

    const db = await getDBConnection();
    await db.query("DELETE FROM payments WHERE payment_uuid = ?", [payment_uuid]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}