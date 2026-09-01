import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../../db";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

/* ---------------- EMAIL TRANSPORT ---------------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ---------------- GET: FETCH USERS ---------------- */
export async function GET(req: Request) {
  const db = await getDBConnection();
  // Check authorization
  const authError = await authorize(req, db);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  // Get UUID from query parameters
  const url = new URL(req.url);
  const uuid = url.searchParams.get("uuid");

  let rows;

  if (uuid) {
    // Fetch only the user with the given UUID
    const [result] = await db.query("SELECT * FROM users WHERE uuid = ?", [uuid]);
    rows = result;
  } else {
    // Fetch all users
    const [result] = await db.query("SELECT * FROM users ORDER BY id DESC");
    rows = result;
  }

  return NextResponse.json(rows);
}

/* ---------------- POST: CREATE USER ---------------- */
export async function POST(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { first_name, last_name, user_email, phone, batch } = await req.json();

    if (!first_name || !last_name || !user_email || !phone || !batch) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const batchRegex = /^[0-9]{4}OL$/i;
    if (!batchRegex.test(batch)) {
      return NextResponse.json(
        { error: "Invalid batch format. Use YYYYOL (e.g., 2027OL)" },
        { status: 400 }
      );
    }

    /* Generate Student ID */
    const [rows]: any = await db.query(
      "SELECT student_id FROM users ORDER BY id DESC LIMIT 1"
    );

    let newStudentId = "SD0001";
    if (rows.length > 0) {
      const num = parseInt(rows[0].student_id.replace("SD", "")) + 1;
      newStudentId = `SD${num.toString().padStart(4, "0")}`;
    }

    const student_uuid = uuidv4();
    const setup_token = uuidv4();
    const token_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO users 
      (uuid, student_id, first_name, last_name, user_email, phone, batch, setup_token, token_expiry, create_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        student_uuid,
        newStudentId,
        first_name,
        last_name,
        user_email,
        phone,
        batch,
        setup_token,
        token_expiry,
      ]
    );

    const setupLink = `${process.env.APP_URL}/student/setup?token=${setup_token}`;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user_email,
      subject: "Complete Your Account Setup",
      html: `
        <p>Hello ${first_name} ${last_name},</p>
        <p>Please complete your account setup:</p>
        <a href="${setupLink}">Set Up Your Account</a>
        <p>This link expires in 24 hours.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      uuid: student_uuid,
      student_id: newStudentId,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------- PUT: UPDATE USER ---------------- */
export async function PUT(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { uuid, student_id, first_name, last_name, user_email, phone, batch } =
      await req.json();

    if (!uuid || !student_id || !first_name || !last_name || !user_email || !phone || !batch) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [result]: any = await db.query(
      `UPDATE users 
       SET student_id=?, first_name=?, last_name=?, user_email=?, phone=?, batch=?
       WHERE uuid=?`,
      [student_id, first_name, last_name, user_email, phone, batch, uuid]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------- DELETE: REMOVE USER ---------------- */
export async function DELETE(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { searchParams } = new URL(req.url);
    const uuid = searchParams.get("uuid");

    if (!uuid) {
      return NextResponse.json({ error: "Missing UUID" }, { status: 400 });
    }

    const [result]: any = await db.query("DELETE FROM users WHERE uuid = ?", [uuid]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
