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
      subject: "Complete Your Account Setup - Volit LMS",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Complete Your Account Setup</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
                  <tr>
                    <td height="4" style="background: linear-gradient(90deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%);"></td>
                  </tr>
                  <tr>
                    <td style="padding: 36px 32px; text-align: center;">
                      <div style="margin-bottom: 20px;">
                        <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 8px 20px; border-radius: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase;">
                          Volit LMS System
                        </div>
                      </div>
                      <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Account Setup Invitation</h1>
                      <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                        Hello <strong>${first_name} ${last_name}</strong>,<br/>
                        You have been registered to the LMS platform. Please click the button below to complete setting up your account:
                      </p>
                      <div style="margin: 28px 0;">
                        <a href="${setupLink}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                          Set Up Your Account
                        </a>
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                        This setup link expires in <strong>24 hours</strong>.
                      </p>
                      <div style="margin: 28px 0 20px 0; border-top: 1px solid #f1f5f9;"></div>
                      <div style="text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                          Volit LMS System
                        </p>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                          Developed and Maintained by Cloudwave (Pvt) Ltd
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
