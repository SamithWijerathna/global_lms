import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { dbQuery } from "../lib/db";
import { sendSuccess, sendError } from "../lib/routeUtils";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "global_lms_super_secret_jwt_key_2026_secure";

// Tenant User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, "MISSING_CREDENTIALS", "Email and password are required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password).trim();

    const users = await dbQuery<any[]>(
      "SELECT * FROM users WHERE LOWER(user_email) = ? LIMIT 1",
      [normalizedEmail]
    );
    if (users.length === 0) {
      return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const user = users[0];
    const checkPassword = (input: string, stored: string) => {
      if (!stored) return false;
      if (input === stored) return true;
      try {
        const safeHash = stored.replace(/^\[bay]\$/, "$");
        return bcrypt.compareSync(input, safeHash);
      } catch (_) {
        return false;
      }
    };

    if (!checkPassword(rawPassword, user.user_password)) {
      return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const token = jwt.sign(
      {
        userId: user.uuid || String(user.id),
        email: user.user_email,
        name: fullName,
        tenantId: req.tenant?.id,
        tenantDbName: req.tenant?.dbName,
        role: user.student_id?.startsWith("ADM") ? "admin" : "student",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Update last login
    await dbQuery(
      `INSERT INTO user_last_login (user_uuid, device_name, ip_address, last_login)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE device_name = VALUES(device_name), ip_address = VALUES(ip_address), last_login = NOW()`,
      [user.uuid || String(user.id), req.headers["user-agent"] || "Web Browser", req.ip]
    ).catch(() => {});

    return sendSuccess(res, {
      token,
      user: {
        id: user.uuid || String(user.id),
        studentId: user.student_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.user_email,
        phone: user.phone,
        profileUrl: user.profile_url,
        batch: user.batch,
        role: user.student_id?.startsWith("ADM") ? "admin" : "student",
      },
      tenant: req.tenant ? { id: req.tenant.id, slug: req.tenant.slug } : null,
    });
  } catch (err: any) {
    return sendError(res, 500, "LOGIN_FAILED", err.message || "Login failed.");
  }
});

// Get Current User Profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const users = await dbQuery<any[]>(
      "SELECT id, uuid, student_id, first_name, last_name, user_email, phone, birthday, id_number, batch, profile_url FROM users WHERE uuid = ? OR id = ? LIMIT 1",
      [req.user?.id, req.user?.id]
    );
    if (users.length === 0) {
      return sendError(res, 404, "USER_NOT_FOUND", "User profile not found.");
    }
    return sendSuccess(res, users[0]);
  } catch (err: any) {
    return sendError(res, 500, "PROFILE_FETCH_FAILED", err.message || "Failed to fetch profile.");
  }
});

export default router;
