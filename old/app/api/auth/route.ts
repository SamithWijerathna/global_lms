import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { getDBConnection } from "../db";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const resend = new Resend(process.env.RESEND_API_KEY);
const getResendFrom = () => process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || "Lashinigeo <noreply@test.cloudwave.asia>";
const getAppLogoUrl = () => {
  const baseUrl = process.env.APP_URL || "https://lashinigeo.lk";
  return `${baseUrl.replace(/\/$/, "")}/assets/logo.png`;
};

// ==================== GET - Fetch user(s) ====================
export async function GET(req: Request) {
  const db = await getDBConnection();
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const user_uuid = url.searchParams.get("user_uuid");

  // Get cookies from the request (Next.js API Route compatible)
  let accessToken = undefined;
  if (typeof (req as any).cookies?.get === "function") {
    accessToken = (req as any).cookies.get("accessToken")?.value;
  } else {
    // fallback for edge/serverless
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/accessToken=([^;]+)/);
      if (match) accessToken = match[1];
    }
  }

  if (action === "me") {
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "your-secret-key");
      const [rows] = await db.query("SELECT * FROM users WHERE uuid = ?", [(decoded as any).uuid]);
      const user = (rows as any[])[0];
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        user: {
          uuid: user.uuid,
          student_id: user.student_id,
          id_number: user.id_number,
          first_name: user.first_name,
          last_name: user.last_name,
          user_email: user.user_email,
          user_address: user.user_address,
          phone: user.phone,
          birthday: user.birthday,
          profile_url: user.profile_url,
          batch: user.batch,
          created_at: user.create_at,
        }
      });
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  try {
    // If user_uuid is provided, return single user
    if (user_uuid) {
      const [rows] = await db.query("SELECT * FROM users WHERE uuid = ?", [user_uuid]);
      const user = (rows as any[])[0];
    
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    
      return NextResponse.json({  
        uuid: user.uuid,
        student_id: user.student_id,
        first_name: user.first_name,
        last_name: user.last_name,
        batch: user.batch,
        birthday: user.birthday,
        phone: user.phone,
        profile_url: user.profile_url,
        user_email: user.user_email,
        user_address: user.user_address,
        create_at: user.create_at
      });
    }
   
    // Otherwise, return all users
    const [rows] = await db.query(
      "SELECT uuid, student_id, first_name, last_name, batch, phone, profile_url, user_email FROM users ORDER BY create_at DESC"
    );
    return NextResponse.json(rows);
   
  } catch (error) {
    console.error("Error fetching user(s):", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ==================== POST - Registration & Authentication ====================
export async function POST(req: Request) {
  const db = await getDBConnection();
  const contentType = req.headers.get("content-type") || "";

  try {
    // ✅ 1. Handle multipart form-data (registration with file upload)
    if (contentType.startsWith("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action") as string;
      if (action === "register") {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const phone = formData.get("phone") as string;
        const address = formData.get("address") as string;
        const birthday = formData.get("birthday") as string;
        const idNumber = formData.get("idNumber") as string;
        const batch = formData.get("batch") as string;
        const profileFile = formData.get("profile") as File;
        const first_name = formData.get("first_name") as string;
        const last_name = formData.get("last_name") as string;

        // Validate required fields
        if (!email || !password || !first_name || !last_name) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate new student ID
        const [rows] = await db.query(
          "SELECT student_id FROM users ORDER BY create_at DESC LIMIT 1"
        );
        let newStudentId = "SD0001";
        if ((rows as any[]).length > 0) {
          const lastId = (rows as any[])[0].student_id;
          const num = parseInt(lastId.replace("SD", ""), 10) + 1;
          newStudentId = `SD${num.toString().padStart(4, "0")}`;
        }

        // Handle profile image upload
        let profileUrl = null;
        if (profileFile && profileFile.size > 0) {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "profile");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const arrayBuffer = await profileFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = path.extname(profileFile.name) || ".jpg";
          const filename = `${newStudentId}${ext}`;
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, buffer);
          profileUrl = `/uploads/profile/${filename}`;
        }

        // Hash password and insert user
        const user_uuid = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
      
        await db.query(
          `INSERT INTO users (uuid, first_name, last_name, student_id, user_email, user_password, user_address, phone, birthday, id_number, batch, profile_url, create_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            user_uuid,
            first_name,
            last_name,
            newStudentId,
            email,
            hashedPassword,
            address,
            phone,
            birthday,
            idNumber,
            batch,
            profileUrl,
          ]
        );

        // Clean up OTP after successful registration
        await db.query("DELETE FROM email_otps WHERE email = ?", [email]);

        return NextResponse.json({
          message: "Registration complete!",
          student_id: newStudentId,
          profile_url: profileUrl,
        });
      }
    }

    // ✅ 2. Handle JSON requests
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const {
      action,
      email,
      password,
      otp,
      uuid,
      currentPassword,
      newPassword,
    } = body;

    // ✅ 3. Send OTP (for registration)
    if (action === "sendOtp") {
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      const [existing] = await db.query(
        "SELECT * FROM users WHERE user_email = ?",
        [email]
      );
      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      await db.query(
        "INSERT INTO email_otps (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp=?, expires_at=?",
        [email, code, expires, code, expires]
      );
      try {
        await resend.emails.send({
          from: getResendFrom(),
          to: email,
          subject: "🔐 Your Lashinigeo OTP Code",
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f8f6; padding: 40px 15px; text-align: center;">
              <div style="background: #ffffff; max-width: 480px; margin: 0 auto; padding: 36px 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(7, 56, 62, 0.08); border: 1px solid #e5efe9;">
                <div style="margin-bottom: 24px;">
                  <img src="${getAppLogoUrl()}" alt="Lashinigeo" style="max-height: 52px; width: auto; display: inline-block;" />
                </div>
                <h2 style="color: #07383E; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Lashinigeo Verification</h2>
                <p style="color: #38605c; font-size: 15px; line-height: 1.5; margin-bottom: 28px;">
                  Use the following One-Time Password (OTP) to verify your account. This code will expire in <b>10 minutes</b>.
                </p>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #07383E; background: #eef8f2; display: inline-block; padding: 14px 28px; border-radius: 12px; border: 1px solid #66D47E; margin-bottom: 24px;">
                  ${code}
                </div>
                <p style="color: #6a8c88; font-size: 13px; margin-bottom: 0;">
                  If you didn't request this code, please ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e8f2ec; margin: 28px 0;" />
                <p style="font-size: 12px; color: #8aa8a3; margin-bottom: 6px;">
                  © ${new Date().getFullYear()} Lashinigeo. All rights reserved.
                </p>
                <p style="font-size: 12px; color: #8aa8a3; margin: 0;">
                  Developed and Maintained by <a href="https://cloudwave.asia" target="_blank" style="color: #07383E; text-decoration: none; font-weight: 600;">CloudWave.asia</a>
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error sending OTP email:", emailError);
        return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
      }
      return NextResponse.json({ message: "OTP sent" });
    }

    // ✅ 4. Verify OTP – supports both registration and forgot password flows
    if (action === "verifyOtp") {
      if (!email || !otp) {
        return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
      }

      // First check password_resets table (forgot password flow)
      const [resetRows] = await db.query(
        "SELECT expires_at FROM password_resets WHERE email = ? AND token = ?",
        [email, otp]
      );

      if ((resetRows as any[]).length > 0) {
        const record = (resetRows as any[])[0];
        if (new Date(record.expires_at) < new Date()) {
          return NextResponse.json({ error: "OTP expired" }, { status: 400 });
        }
        return NextResponse.json({ message: "OTP verified successfully" });
      }

      // Fallback to email_otps table (registration flow)
      const [otpRows] = await db.query(
        "SELECT expires_at FROM email_otps WHERE email = ? AND otp = ?",
        [email, otp]
      );

      if ((otpRows as any[]).length === 0) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
      }

      const record = (otpRows as any[])[0];
      if (new Date(record.expires_at) < new Date()) {
        return NextResponse.json({ error: "OTP expired" }, { status: 400 });
      }

      return NextResponse.json({ message: "OTP verified successfully" });
    }

    // ✅ 5. Login
    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }
      const [rows] = await db.query("SELECT * FROM users WHERE user_email = ?", [email]);
      const users = rows as any[];
    
      if (users.length === 0) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.user_password);
    
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        {
          uuid: user.uuid,
          email: user.user_email,
          student_id: user.student_id,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );
      const refreshToken = jwt.sign(
        {
          uuid: user.uuid,
          email: user.user_email,
        },
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
        { expiresIn: "7d" }
      );

      const response = NextResponse.json({
        message: "Login successful",
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          uuid: user.uuid,
          student_id: user.student_id,
          email: user.user_email,
          first_name: user.first_name,
          last_name: user.last_name,
          profile: user.profile_url,
        },
      });

      // Set secure httpOnly cookies
      response.cookies.set({
        name: "accessToken",
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      response.cookies.set({
        name: "refreshToken",
        value: refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // ✅ 6. Signout
    if (action === "signout") {
      const response = NextResponse.json({ message: "Signed out successfully" });
      response.cookies.set({
        name: "accessToken",
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      response.cookies.set({
        name: "refreshToken",
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      response.cookies.set({
        name: "userdata",
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // ✅ 7. Change Password
    if (action === "changePassword") {
      if (!uuid || !currentPassword || !newPassword) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const [rows] = await db.query("SELECT * FROM users WHERE uuid = ?", [uuid]);
      const users = rows as any[];
    
      if (users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const user = users[0];
      const isValid = await bcrypt.compare(currentPassword, user.user_password);
    
      if (!isValid) {
        return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await db.query("UPDATE users SET user_password = ? WHERE uuid = ?", [hashed, uuid]);
      return NextResponse.json({ message: "Password changed successfully" });
    }

    // ✅ 8. Refresh Token
    if (action === "refreshToken") {
      try {
        const refreshToken = body.refreshToken || req.headers.get("x-refresh-token");
      
        if (!refreshToken) {
          return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
        }
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
        ) as any;
        const [rows] = await db.query("SELECT * FROM users WHERE uuid = ?", [decoded.uuid]);
        const users = rows as any[];
      
        if (users.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const user = users[0];
        const newAccessToken = jwt.sign(
          {
            uuid: user.uuid,
            email: user.user_email,
            student_id: user.student_id,
          },
          process.env.JWT_SECRET || "your-secret-key",
          { expiresIn: "24h" }
        );
        const response = NextResponse.json({
          message: "Token refreshed",
          accessToken: newAccessToken,
        });
        response.cookies.set({
          name: "accessToken",
          value: newAccessToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        });
        return response;
      } catch (error) {
        return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
      }
    }

    // ✅ 9. Forgot Password - Send OTP
    if (action === "forgotPassword") {
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      const [users] = await db.query("SELECT uuid FROM users WHERE user_email = ?", [email]);
      if ((users as any[]).length === 0) {
        return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000);
      await db.query(
        "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?",
        [email, code, expires, code, expires]
      );
      try {
        await resend.emails.send({
          from: getResendFrom(),
          to: email,
          subject: "🔐 Reset Your Lashinigeo Password",
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f8f6; padding: 40px 15px; text-align: center;">
              <div style="background: #ffffff; max-width: 480px; margin: 0 auto; padding: 36px 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(7, 56, 62, 0.08); border: 1px solid #e5efe9;">
                <div style="margin-bottom: 24px;">
                  <img src="${getAppLogoUrl()}" alt="Lashinigeo" style="max-height: 52px; width: auto; display: inline-block;" />
                </div>
                <h2 style="color: #07383E; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Password Reset Request</h2>
                <p style="color: #38605c; font-size: 15px; line-height: 1.5; margin-bottom: 28px;">
                  We received a request to reset your Lashinigeo password. Use the code below to set a new password.
                </p>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #07383E; background: #eef8f2; display: inline-block; padding: 14px 28px; border-radius: 12px; border: 1px solid #66D47E; margin-bottom: 24px;">
                  ${code}
                </div>
                <p style="color: #38605c; font-size: 14px; margin-bottom: 20px;">
                  This code expires in <strong>15 minutes</strong>.
                </p>
                <p style="color: #6a8c88; font-size: 13px; margin-bottom: 0;">
                  If you didn't request this, you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e8f2ec; margin: 28px 0;" />
                <p style="font-size: 12px; color: #8aa8a3; margin-bottom: 6px;">
                  © ${new Date().getFullYear()} Lashinigeo. All rights reserved.
                </p>
                <p style="font-size: 12px; color: #8aa8a3; margin: 0;">
                  Developed and Maintained by <a href="https://cloudwave.asia" target="_blank" style="color: #07383E; text-decoration: none; font-weight: 600;">CloudWave.asia</a>
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error sending password reset email:", emailError);
        return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 });
      }
      return NextResponse.json({ message: "Reset code sent to email" });
    }

    // ✅ 10. Reset Password
    if (action === "resetPassword") {
      const { email: resetEmail, token, newPassword: resetPassword } = body;
      if (!resetEmail || !token || !resetPassword) {
        return NextResponse.json({ error: "Email, token, and new password required" }, { status: 400 });
      }
      const [rows] = await db.query(
        "SELECT * FROM password_resets WHERE email = ? AND token = ?",
        [resetEmail, token]
      );
      const record = (rows as any[])[0];
      if (!record || new Date(record.expires_at) < new Date()) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(resetPassword, 10);
      await db.query("UPDATE users SET user_password = ? WHERE user_email = ?", [hashed, resetEmail]);
      await db.query("DELETE FROM password_resets WHERE email = ?", [resetEmail]);
      return NextResponse.json({ message: "Password reset successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ==================== PUT - Update user ====================
export async function PUT(req: Request) {
  const db = await getDBConnection();
  const contentType = req.headers.get("content-type") || "";
 
  try {
    // Handle multipart form-data (with image upload)
    if (contentType.startsWith("multipart/form-data")) {
      const formData = await req.formData();
     
      const uuid = formData.get("uuid") as string;
      const student_id = formData.get("student_id") as string;
      const first_name = formData.get("first_name") as string;
      const last_name = formData.get("last_name") as string;
      const user_email = formData.get("user_email") as string;
      const phone = formData.get("phone") as string;
      const batch = formData.get("batch") as string;
      const user_address = formData.get("user_address") as string;
      const birthday = formData.get("birthday") as string;
      const profileFile = formData.get("profile") as File | null;
     
      if (!uuid) {
        return NextResponse.json({ error: "Missing uuid" }, { status: 400 });
      }
     
      let profileUrl: string | undefined;
     
      // Handle image upload if provided
      if (profileFile && profileFile.size > 0) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "profile");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
       
        const arrayBuffer = await profileFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = path.extname(profileFile.name) || ".jpg";
        const filename = `${student_id || Date.now()}${ext}`;
        const filepath = path.join(uploadDir, filename);
       
        // Delete old profile image if exists
        const [existingUser] = await db.query(
          "SELECT profile_url FROM users WHERE uuid = ?",
          [uuid]
        );
        const oldProfileUrl = (existingUser as any[])[0]?.profile_url;
        if (oldProfileUrl) {
          const oldFilepath = path.join(process.cwd(), "public", oldProfileUrl);
          if (fs.existsSync(oldFilepath)) {
            fs.unlinkSync(oldFilepath);
          }
        }
       
        fs.writeFileSync(filepath, buffer);
        profileUrl = `/uploads/profile/${filename}`;
      }
     
      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
     
      if (first_name) updates.push("first_name = ?"), values.push(first_name);
      if (last_name) updates.push("last_name = ?"), values.push(last_name);
      if (user_email) updates.push("user_email = ?"), values.push(user_email);
      if (phone) updates.push("phone = ?"), values.push(phone);
      if (batch) updates.push("batch = ?"), values.push(batch);
      if (user_address) updates.push("user_address = ?"), values.push(user_address);
      if (birthday) updates.push("birthday = ?"), values.push(birthday);
      if (profileUrl) updates.push("profile_url = ?"), values.push(profileUrl);
     
      if (updates.length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }
     
      values.push(uuid);
     
      await db.query(
        `UPDATE users SET ${updates.join(", ")} WHERE uuid = ?`,
        values
      );
     
      return NextResponse.json({
        message: "User updated successfully",
        profile_url: profileUrl
      });
    }
   
    // Handle JSON (without image upload)
    const body = await req.json();
    const { uuid, first_name, last_name, user_email, phone, batch, user_address, birthday } = body;
   
    if (!uuid) {
      return NextResponse.json({ error: "Missing uuid" }, { status: 400 });
    }
   
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
   
    if (first_name !== undefined) updates.push("first_name = ?"), values.push(first_name);
    if (last_name !== undefined) updates.push("last_name = ?"), values.push(last_name);
    if (user_email !== undefined) updates.push("user_email = ?"), values.push(user_email);
    if (phone !== undefined) updates.push("phone = ?"), values.push(phone);
    if (batch !== undefined) updates.push("batch = ?"), values.push(batch);
    if (user_address !== undefined) updates.push("user_address = ?"), values.push(user_address);
    if (birthday !== undefined) updates.push("birthday = ?"), values.push(birthday);
   
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
   
    values.push(uuid);
   
    await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE uuid = ?`,
      values
    );
   
    return NextResponse.json({ message: "User updated successfully" });
   
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ==================== DELETE - Delete user ====================
export async function DELETE(req: Request) {
  const db = await getDBConnection();
 
  try {
    const body = await req.json();
    const { uuid } = body;
   
    if (!uuid) {
      return NextResponse.json({ error: "Missing uuid" }, { status: 400 });
    }
   
    // Get profile URL before deletion to remove file
    const [rows] = await db.query("SELECT profile_url FROM users WHERE uuid = ?", [uuid]);
    const user = (rows as any[])[0];
   
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
   
    // Delete profile image if exists
    if (user.profile_url) {
      const filepath = path.join(process.cwd(), "public", user.profile_url);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
   
    // Delete user from database
    await db.query("DELETE FROM users WHERE uuid = ?", [uuid]);
   
    return NextResponse.json({ message: "User deleted successfully" });
   
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}