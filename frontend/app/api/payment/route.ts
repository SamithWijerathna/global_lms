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
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");
    const db = await getDBConnection();

    // 1. Try rich SQL query with joins
    try {
      const baseQuery = `
        SELECT 
          p.*,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.user_email,
            u.student_id,
            'Unknown Student'
          ) AS student_name,
          COALESCE(c.class_title, 'Unknown Class') AS class_title
        FROM payments p
        LEFT JOIN users u ON (p.student_uuid = u.uuid OR p.student_uuid = u.student_id OR p.student_uuid = CAST(u.id AS CHAR))
        LEFT JOIN class_list c ON (p.item_id = c.class_id OR p.item_id = CAST(c.id AS CHAR))
      `;

      if (all) {
        const [rows] = await db.query(`${baseQuery} ORDER BY p.created_at DESC`);
        return NextResponse.json({ payments: rows });
      }

      const [rows] = await db.query(`${baseQuery} WHERE p.status = 'pending' ORDER BY p.created_at DESC`);
      return NextResponse.json({ payments: rows });
    } catch (joinError) {
      console.warn("SQL Join query failed, falling back to simple query:", joinError);

      // 2. Safe fallback query directly on payments table
      if (all) {
        const [rows] = await db.query("SELECT * FROM payments ORDER BY created_at DESC");
        return NextResponse.json({ payments: rows });
      }

      const [rows] = await db.query("SELECT * FROM payments WHERE status = 'pending' ORDER BY created_at DESC");
      return NextResponse.json({ payments: rows });
    }
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

/* --------------------------------------------------------------------- */
/*  DELETE – permanently remove a payment (supports id & payment_uuid)   */
/* --------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get("id");
    const queryUuid = url.searchParams.get("payment_uuid");

    let payment_id: any = queryId;
    let payment_uuid: any = queryUuid;

    if (!payment_id && !payment_uuid) {
      try {
        const body = await req.json();
        payment_id = body.id || body.payment_id;
        payment_uuid = body.payment_uuid;
      } catch (e) {
        // body parsing failed or empty
      }
    }

    if (!payment_id && !payment_uuid) {
      return NextResponse.json({ error: "Missing payment ID or payment_uuid" }, { status: 400 });
    }

    const db = await getDBConnection();

    if (payment_id) {
      await db.query("DELETE FROM payments WHERE id = ?", [payment_id]);
    } else if (payment_uuid) {
      await db.query("DELETE FROM payments WHERE payment_uuid = ?", [payment_uuid]);
    }

    return NextResponse.json({ success: true, message: "Payment deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}