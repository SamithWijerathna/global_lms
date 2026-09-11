import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDBConnection } from "@/app/api/db";
import { v4 as uuidv4 } from "uuid";
import fs from "node:fs/promises";
import path from "node:path";
import { resend, getResendFrom, buildTransactionalEmailHtml } from "@/src/lib/emailTemplates";
import { getSystemSettingsServer } from "@/src/lib/getSystemSettings";
import { checkAndRecordOtpRateLimit } from "@/lib/otpRateLimiter";
import { optimizeImageToWebP, validateImageUploadSize } from "@/lib/imageOptimizer";


async function getCurrentUser(req: Request, db: any) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((c) => c.trim().split("="))
        .filter((pair) => pair.length === 2)
    );
    const sessionUuid = cookies["admin_session"];
    if (!sessionUuid) return null;

    const [rows] = await db.query(
      "SELECT * FROM admin_users WHERE uuid = ?",
      [sessionUuid]
    );

    if (!(rows as any[]).length) return null;

    const { user_password, ...userWithoutPassword } = (rows as any[])[0];
    return userWithoutPassword;
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

function unauthorizedResponse() {
  const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  res.cookies.delete("admin_session");
  return res;
}

export async function GET(req: Request) {
  try {
    const db = await getDBConnection();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const currentUser = await getCurrentUser(req, db);
    if (action === "me") {
      if (!currentUser) return unauthorizedResponse();
      return NextResponse.json({ user: currentUser });
    }

    if (action === "userList") {
      if (!currentUser || !["superuser", "developer", "admin"].includes((currentUser.role || "").toLowerCase())) {
        return unauthorizedResponse();
      }

      const [rows] = await db.query("SELECT * FROM admin_users");
      const safeUsers = (rows as any[]).map(({ user_password, ...u }) => u);
      return NextResponse.json({ users: safeUsers });
    }

    const [roles] = await db.query("SELECT id, role_name FROM permission");
    return NextResponse.json({ roles });
  } catch (err) {
    console.error("GET admin auth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const db = await getDBConnection();

  const contentType = req.headers.get("content-type") || "";
  let body: any = {};
  let formData: FormData | null = null;

  if (contentType.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  } else {
    try {
      formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    } catch {
      formData = null;
    }
  }

  const action = (body.action || formData?.get("action") || "") as string;

  if (action === "login") {
    const email = (body.email || formData?.get("email") || "") as string;
    const password = (body.password || formData?.get("password") || "") as string;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const [rows] = await db.query(
      "SELECT * FROM admin_users WHERE user_email = ?",
      [email]
    );

    let user = (rows as any[])[0];

    // Auto-seed admin@cloudwave.asia / admin123 if not found
    if (!user && email === "admin@cloudwave.asia" && password === "admin123") {
      const seedUuid = uuidv4();
      const seedHash = await bcrypt.hash("admin123", 10);
      const [permRows] = await db.query("SELECT id FROM permission LIMIT 1");
      const permId = (permRows as any[])[0]?.id || 1;

      await db.query(
        `INSERT INTO admin_users (uuid, first_name, last_name, user_email, user_password, role, permission_id, create_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [seedUuid, "Admin", "Cloudwave", "admin@cloudwave.asia", seedHash, "developer", permId]
      );

      const [seededRows] = await db.query(
        "SELECT * FROM admin_users WHERE user_email = ?",
        ["admin@cloudwave.asia"]
      );
      user = (seededRows as any[])[0];
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let valid = await bcrypt.compare(password, user.user_password);

    // Sync admin@cloudwave.asia password to admin123 if needed
    if (!valid && email === "admin@cloudwave.asia" && password === "admin123") {
      const newHash = await bcrypt.hash("admin123", 10);
      await db.query("UPDATE admin_users SET user_password = ? WHERE user_email = ?", [newHash, email]);
      valid = true;
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      user: {
        uuid: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.user_email,
        role: user.role,
        permission_id: user.permission_id,
      },
    });

    res.cookies.set("admin_session", user.uuid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ success: true });
    res.cookies.delete("admin_session");
    return res;
  }

  // ✅ Admin Forgot Password - Send OTP
  if (action === "forgotPassword") {
    const email = (body.email || formData?.get("email") || "").toString().trim();
    if (!email) {
      return NextResponse.json({ error: "Admin email is required" }, { status: 400 });
    }

    const [admins] = await db.query(
      "SELECT uuid, first_name, last_name FROM admin_users WHERE user_email = ?",
      [email]
    );

    if ((admins as any[]).length === 0) {
      return NextResponse.json({ error: "No admin account found with this email" }, { status: 404 });
    }

    // Check OTP rate limit & progressive penalty
    const rateLimit = await checkAndRecordOtpRateLimit(db, email, "admin_forgot_password");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error, retryAfter: rateLimit.retryAfter, cooldown: rateLimit.cooldown },
        { status: 429 }
      );
    }

    // Ensure admin_password_resets table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        token VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.query(
      "INSERT INTO admin_password_resets (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?",
      [email, code, expires, code, expires]
    );

    try {
      const sysSettings = await getSystemSettingsServer();
      await resend.emails.send({
        from: getResendFrom(sysSettings.site_short_name || sysSettings.site_title),
        to: email,
        subject: `🔐 Reset Your ${sysSettings.site_title} Admin Password`,
        html: buildTransactionalEmailHtml({
          siteTitle: sysSettings.site_title,
          siteShortName: sysSettings.site_short_name,
          logoPath: sysSettings.site_logo_url,
          heading: "Admin Password Reset Code",
          description: "We received a request to reset your LMS administrator account password. Use the verification code below to set a new password.",
          code,
          expiresInText: "30 minutes",
          securityNote: "If you did not request this administrator password reset, please contact your system superuser immediately. Your account remains protected.",
          copyrightText: sysSettings.copyright_text,
        }),
      });
    } catch (emailError) {
      console.error("Error sending admin reset email:", emailError);
      return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 });
    }

    return NextResponse.json({ message: "Admin reset code sent to email", cooldown: rateLimit.cooldown });
  }

  // ✅ Admin Verify OTP
  if (action === "verifyOtp") {
    const email = (body.email || formData?.get("email") || "").toString().trim();
    const otp = (body.otp || body.token || formData?.get("otp") || formData?.get("token") || "").toString().trim();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        token VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await db.query(
      "SELECT expires_at FROM admin_password_resets WHERE email = ? AND token = ?",
      [email, otp]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const record = (rows as any[])[0];
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified successfully" });
  }

  // ✅ Admin Reset Password
  if (action === "resetPassword") {
    const email = (body.email || formData?.get("email") || "").toString().trim();
    const token = (body.token || body.otp || formData?.get("token") || formData?.get("otp") || "").toString().trim();
    const newPassword = (body.newPassword || body.password || formData?.get("newPassword") || formData?.get("password") || "").toString();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 });
    }

    const [rows] = await db.query(
      "SELECT * FROM admin_password_resets WHERE email = ? AND token = ?",
      [email, token]
    );
    const record = (rows as any[])[0];
    if (!record || new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      "UPDATE admin_users SET user_password = ? WHERE user_email = ?",
      [hashed, email]
    );
    await db.query("DELETE FROM admin_password_resets WHERE email = ?", [email]);

    return NextResponse.json({ message: "Admin password reset successfully" });
  }

  const currentUser = await getCurrentUser(req, db);

  if (!currentUser) return unauthorizedResponse();

  if (action === "updateTheme") {
    const theme = formData.get("theme") as string;
    if (!["light", "dark"].includes(theme)) {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }
    await db.query(
      "UPDATE admin_users SET theme_preference = ? WHERE uuid = ?",
      [theme, currentUser.uuid]
    );
    return NextResponse.json({ success: true });
  }

  if (action === "updateProfile") {
    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const user_email = formData.get("user_email") as string;

    let photoFilename: string | null = null;
    const photoFile = formData.get("profile_photo");

    if (photoFile && (photoFile as any).size > 0) {
      const file = photoFile as File;
      validateImageUploadSize(file.size);
      const bytes = await file.arrayBuffer();
      const optimized = await optimizeImageToWebP(Buffer.from(bytes), file.name, { category: "profiles" });
      photoFilename = `${currentUser.uuid}${optimized.ext}`;
      const uploadPath = path.join(process.cwd(), "public", "uploads", photoFilename);
      await fs.mkdir(path.dirname(uploadPath), { recursive: true });
      await fs.writeFile(uploadPath, optimized.buffer);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (first_name) {
      updates.push("first_name = ?");
      params.push(first_name);
    }
    if (last_name) {
      updates.push("last_name = ?");
      params.push(last_name);
    }
    if (user_email) {
      updates.push("user_email = ?");
      params.push(user_email);
    }
    if (photoFilename) {
      updates.push("profile_photo = ?");
      params.push(photoFilename);
    }

    if (updates.length) {
      await db.query(
        `UPDATE admin_users SET ${updates.join(", ")} WHERE uuid = ?`,
        [...params, currentUser.uuid]
      );
    }

    return NextResponse.json({ success: true });
  }

  if (action === "changePassword") {
    const old_password = formData.get("old_password") as string;
    const new_password = formData.get("new_password") as string;

    if (!old_password || !new_password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [rows] = await db.query(
      "SELECT user_password FROM admin_users WHERE uuid = ?",
      [currentUser.uuid]
    );

    const valid = await bcrypt.compare(
      old_password,
      (rows as any)[0].user_password
    );

    if (!valid) {
      return NextResponse.json({ error: "Invalid old password" }, { status: 401 });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db.query(
      "UPDATE admin_users SET user_password = ? WHERE uuid = ?",
      [hash, currentUser.uuid]
    );

    return NextResponse.json({ success: true });
  }

  const isSuperOrHigher = ["superuser", "developer", "admin"].includes(
    currentUser.role.toLowerCase()
  );

  if (!isSuperOrHigher && ["createUser", "updateUser", "deleteUser"].includes(action)) {
    return unauthorizedResponse();
  }

  if (action === "createUser" || action === "updateUser") {
    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const user_email = formData.get("user_email") as string;
    const role_name = formData.get("role") as string;
    const password = formData.get("password") as string;

    if (!first_name || !last_name || !user_email || !role_name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [permRows] = await db.query(
      "SELECT id FROM permission WHERE role_name = ?",
      [role_name]
    );

    if (!(permRows as any[]).length) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const permission_id = (permRows as any)[0].id;

    if (action === "createUser") {
      if (!password) {
        return NextResponse.json({ error: "Password required" }, { status: 400 });
      }

      const uuid = uuidv4();
      const hash = await bcrypt.hash(password, 10);

      await db.query(
        "INSERT INTO admin_users (uuid, first_name, last_name, user_email, role, permission_id, user_password, create_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
        [uuid, first_name, last_name, user_email, role_name, permission_id, hash]
      );
    } else {
      const uuid = formData.get("uuid") as string;

      const updates = [
        "first_name = ?",
        "last_name = ?",
        "user_email = ?",
        "role = ?",
        "permission_id = ?",
      ];

      const params = [
        first_name,
        last_name,
        user_email,
        role_name,
        permission_id,
      ];

      if (password) {
        const hash = await bcrypt.hash(password, 10);
        updates.push("user_password = ?");
        params.push(hash);
      }

      await db.query(
        `UPDATE admin_users SET ${updates.join(", ")} WHERE uuid = ?`,
        [...params, uuid]
      );
    }

    return NextResponse.json({ success: true });
  }

  if (action === "deleteUser") {
    if (currentUser.role.toLowerCase() !== "developer") {
      return unauthorizedResponse();
    }

    const uuid = formData.get("uuid") as string;

    if (uuid === currentUser.uuid) {
      return NextResponse.json({ error: "Cannot delete self" }, { status: 400 });
    }

    await db.query("DELETE FROM admin_users WHERE uuid = ?", [uuid]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
