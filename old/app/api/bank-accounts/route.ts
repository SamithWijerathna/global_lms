import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  try {
    const db = await getDBConnection();
    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get("all") === "true";

    let rows;
    if (fetchAll) {
      // Check auth if requesting all (active + inactive)
      const authError = await authorize(req, db);
      if (authError) {
        return NextResponse.json({ error: authError.error }, { status: authError.status });
      }
      [rows] = await db.query("SELECT * FROM bank_accounts ORDER BY display_order ASC, id ASC");
    } else {
      [rows] = await db.query("SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY display_order ASC, id ASC");
    }

    return NextResponse.json(rows || []);
  } catch (error: any) {
    console.error("[BANK ACCOUNTS GET ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const body = await req.json();
    const { bank_name, account_name, account_number, branch_name, account_type, instructions, is_active = 1, display_order = 0 } = body;

    if (!bank_name || !account_name || !account_number) {
      return NextResponse.json({ error: "Bank name, account name, and account number are required" }, { status: 400 });
    }

    const accountUuid = `ba-${uuidv4().substring(0, 8)}`;

    const [result] = await db.query(
      `INSERT INTO bank_accounts (uuid, bank_name, account_name, account_number, branch_name, account_type, instructions, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountUuid,
        bank_name.trim(),
        account_name.trim(),
        account_number.trim(),
        branch_name ? branch_name.trim() : null,
        account_type ? account_type.trim() : null,
        instructions ? instructions.trim() : null,
        is_active ? 1 : 0,
        Number(display_order) || 0
      ]
    );

    return NextResponse.json({ success: true, id: (result as any).insertId, uuid: accountUuid });
  } catch (error: any) {
    console.error("[BANK ACCOUNTS POST ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to create bank account" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const body = await req.json();
    const { id, uuid, bank_name, account_name, account_number, branch_name, account_type, instructions, is_active, display_order } = body;

    if (!id && !uuid) {
      return NextResponse.json({ error: "Bank account ID or UUID is required for update" }, { status: 400 });
    }

    if (!bank_name || !account_name || !account_number) {
      return NextResponse.json({ error: "Bank name, account name, and account number are required" }, { status: 400 });
    }

    if (id) {
      await db.query(
        `UPDATE bank_accounts 
         SET bank_name=?, account_name=?, account_number=?, branch_name=?, account_type=?, instructions=?, is_active=?, display_order=?
         WHERE id=?`,
        [
          bank_name.trim(),
          account_name.trim(),
          account_number.trim(),
          branch_name ? branch_name.trim() : null,
          account_type ? account_type.trim() : null,
          instructions ? instructions.trim() : null,
          is_active ? 1 : 0,
          Number(display_order) || 0,
          id
        ]
      );
    } else {
      await db.query(
        `UPDATE bank_accounts 
         SET bank_name=?, account_name=?, account_number=?, branch_name=?, account_type=?, instructions=?, is_active=?, display_order=?
         WHERE uuid=?`,
        [
          bank_name.trim(),
          account_name.trim(),
          account_number.trim(),
          branch_name ? branch_name.trim() : null,
          account_type ? account_type.trim() : null,
          instructions ? instructions.trim() : null,
          is_active ? 1 : 0,
          Number(display_order) || 0,
          uuid
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[BANK ACCOUNTS PUT ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to update bank account" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const uuid = searchParams.get("uuid");

    if (!id && !uuid) {
      return NextResponse.json({ error: "Bank account ID or UUID is required for deletion" }, { status: 400 });
    }

    if (id) {
      await db.query("DELETE FROM bank_accounts WHERE id = ?", [id]);
    } else {
      await db.query("DELETE FROM bank_accounts WHERE uuid = ?", [uuid]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[BANK ACCOUNTS DELETE ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to delete bank account" }, { status: 500 });
  }
}
