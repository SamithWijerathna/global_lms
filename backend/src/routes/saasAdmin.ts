import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, getTenantPool, dbStorage, dbQuery, cloneTenantSchema, clearRouteCache } from "../lib/db";
import { checkCustomDomainDns } from "../lib/dnsVerifier";
import { sendSuccess, sendError } from "../lib/routeUtils";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "global_lms_super_secret_jwt_key_2026_secure";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "lms.circleone.asia";
const DEFAULT_CNAME = process.env.DEFAULT_CNAME_TARGET || "cname.lms.circleone.asia";

// 1. Super Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, "MISSING_REQUIRED_FIELDS", "Email and password are required.");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password).trim();

    // Auto-create default super admin if matching initial credentials
    if (normalizedEmail === "0wsamithaw0@gmail.com" && rawPassword === "Samith@071") {
      const defaultHash = bcrypt.hashSync("Samith@071", 10);
      await pool.execute(
        `INSERT INTO SaaSAdmin (id, email, password, name, role)
         VALUES ('admin-001', '0wsamithaw0@gmail.com', ?, 'System Super Admin', 'Super Admin')
         ON DUPLICATE KEY UPDATE password = VALUES(password)`,
        [defaultHash]
      ).catch(() => {});
    }

    const [adminRows] = await pool.execute<any[]>(
      "SELECT * FROM SaaSAdmin WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );
    const admin = adminRows[0];

    const checkPassword = (input: string, stored: string) => {
      if (!stored) return false;
      if (input === stored) return true;
      try {
        const safeHash = stored.replace(/^\$2[bay]\$/, "$2a$");
        return bcrypt.compareSync(input, safeHash);
      } catch (_) {
        return false;
      }
    };

    if (admin && checkPassword(rawPassword, admin.password)) {
      const token = jwt.sign(
        { userId: admin.id, email: admin.email, name: admin.name, isSuperAdmin: true },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      return sendSuccess(res, {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role || "Super Admin",
          isSuperAdmin: true,
        },
      });
    }

    // Fallback: Check if Tenant Admin
    const [tenantRows] = await pool.execute<any[]>(
      "SELECT * FROM SaaSTenant WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );
    const tenant = tenantRows[0];
    if (tenant && checkPassword(rawPassword, tenant.password)) {
      const token = jwt.sign(
        {
          userId: tenant.id,
          email: tenant.email,
          name: tenant.name,
          tenantId: tenant.id,
          tenantDbName: tenant.dbName,
          role: "Tenant Admin",
          isSuperAdmin: false,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      return sendSuccess(res, {
        token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          plan: tenant.plan,
          role: "Tenant Admin",
          isSuperAdmin: false,
        },
      });
    }

    return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
  } catch (err: any) {
    return sendError(res, 500, "LOGIN_FAILED", err.message || "Login failed.");
  }
});

// 2. List All Tenants (Super Admin)
router.get("/tenants", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const [tenants] = await pool.execute<any[]>(
      `SELECT t.id, t.name, t.slug, t.email, t.phone, t.plan, t.monthlyPrice, t.status, 
              t.dbName, t.maxStorageMb, t.licenseKey, t.startDate, t.expiryDate, t.createdAt,
              d.domain AS primaryDomain, d.type AS domainType, d.isVerified AS domainVerified
       FROM SaaSTenant t
       LEFT JOIN TenantDomain d ON t.id = d.tenantId AND d.isPrimary = 1
       ORDER BY t.createdAt DESC`
    );

    return sendSuccess(res, tenants);
  } catch (err: any) {
    return sendError(res, 500, "FETCH_TENANTS_FAILED", err.message || "Failed to retrieve tenants.");
  }
});

// 2.1 Check Domain CNAME Record Before Tenant Provisioning
router.post("/check-cname", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain || typeof domain !== "string") {
      return sendError(res, 400, "INVALID_DOMAIN", "Domain name is required.");
    }
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleanDomain.includes(".") || cleanDomain.length < 4) {
      return sendError(res, 400, "INVALID_DOMAIN_FORMAT", "Please enter a valid domain name (e.g. lms.myacademy.com).");
    }

    const [existing] = await pool.execute<any[]>(
      "SELECT id FROM TenantDomain WHERE LOWER(domain) = ? LIMIT 1",
      [cleanDomain]
    );
    if (existing.length > 0) {
      return sendError(res, 400, "DOMAIN_EXISTS", "This domain is already registered in Volit.");
    }

    const dnsResult = await checkCustomDomainDns(cleanDomain, DEFAULT_CNAME, "");
    return sendSuccess(res, {
      domain: cleanDomain,
      cnameTarget: DEFAULT_CNAME,
      verified: dnsResult.cnameMatched || dnsResult.verified,
      currentCnames: dnsResult.currentCnames,
      message: dnsResult.cnameMatched
        ? `CNAME record is successfully pointed to ${DEFAULT_CNAME}`
        : `CNAME record for '${cleanDomain}' is not pointing to '${DEFAULT_CNAME}'.`,
    });
  } catch (err: any) {
    return sendError(res, 500, "DNS_CHECK_FAILED", err.message || "Failed to check domain DNS.");
  }
});

// 3. Create / Provision New Tenant (Super Admin)
router.post("/tenants", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      customDomain,
      domain,
      email,
      password,
      phone,
      plan = "Starter",
      monthlyPrice = "LKR 5,000",
      maxStorageMb = 5000,
      startDate,
      expiryDate,
      initialInvoiceAmount,
    } = req.body;

    const targetDomain = (customDomain || domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!name || !email || !targetDomain) {
      return sendError(res, 400, "MISSING_REQUIRED_FIELDS", "Institute Name, Admin Email, and Custom Domain are required.");
    }

    let derivedSlug = (slug || targetDomain.replace(/[^a-z0-9]/g, "-") || name.toLowerCase().replace(/[^a-z0-9]/g, "-"))
      .trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
    if (!derivedSlug) {
      derivedSlug = `tenant-${crypto.randomBytes(3).toString("hex")}`;
    }

    const [existingDomain] = await pool.execute<any[]>(
      "SELECT id FROM TenantDomain WHERE LOWER(domain) = ? LIMIT 1",
      [targetDomain]
    );
    if (existingDomain.length > 0) {
      return sendError(res, 400, "DOMAIN_EXISTS", "A tenant with this domain already exists.");
    }

    const tenantId = crypto.randomUUID();
    const dbName = `lms_tenant_${derivedSlug.replace(/-/g, "_")}_${crypto.randomBytes(2).toString("hex")}`;
    const initialPassword =
      typeof password === "string" && password.trim().length >= 6
        ? password.trim()
        : crypto.randomBytes(6).toString("hex");

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(initialPassword, salt);
    const licenseKey = `VOLIT-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const normStartDate = startDate || new Date().toISOString().split("T")[0];
    const normExpiryDate = expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 1. Insert Central SaaSTenant record
    await pool.execute(
      `INSERT INTO SaaSTenant (id, name, slug, email, password, phone, plan, monthlyPrice, status, dbName, maxStorageMb, licenseKey, startDate, expiryDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [
        tenantId,
        name.trim(),
        derivedSlug,
        email.trim().toLowerCase(),
        hashedPassword,
        phone || null,
        plan,
        monthlyPrice,
        dbName,
        maxStorageMb,
        licenseKey,
        normStartDate,
        normExpiryDate,
      ]
    );

    // 2. Provision Tenant Database Schema
    const schemaOk = await cloneTenantSchema(dbName);
    if (!schemaOk) {
      console.warn(`Database schema creation had warnings for ${dbName}`);
    }

    // 3. Seed Tenant Default Admin User
    const tenantPool = getTenantPool(dbName);
    await dbStorage.run(tenantPool, async () => {
      const adminUuid = crypto.randomUUID();
      await dbQuery(
        `INSERT INTO users (uuid, student_id, first_name, last_name, user_email, phone, user_password, profile_completed)
         VALUES (?, 'ADM0001', 'Admin', ?, ?, ?, ?, 1)`,
        [adminUuid, name.trim(), email.trim().toLowerCase(), phone || "0770000000", hashedPassword]
      );
    });

    // 4. Register Primary Domain
    const domainId = crypto.randomUUID();
    const token = crypto.randomBytes(16).toString("hex");
    await pool.execute(
      `INSERT INTO TenantDomain (id, tenantId, domain, type, cnameTarget, verificationToken, isVerified, isPrimary, sslStatus)
       VALUES (?, ?, ?, 'custom_domain', ?, ?, 1, 1, 'active')`,
      [domainId, tenantId, targetDomain, DEFAULT_CNAME, token]
    );

    // 5. Register in TenantRouting table
    const routeId = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO TenantRouting (id, domain, tenantId, tenantSlug, tenantDbName, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [routeId, targetDomain, tenantId, derivedSlug, dbName]
    );

    // 6. Initial invoice creation if requested
    if (initialInvoiceAmount && parseFloat(initialInvoiceAmount) > 0) {
      const invoiceId = crypto.randomUUID();
      const invNumber = `INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await pool.execute(
        `INSERT INTO SaaSInvoice (id, tenantId, invoiceNumber, amount, currency, status, dueDate)
         VALUES (?, ?, ?, ?, 'LKR', 'paid', ?)`,
        [invoiceId, tenantId, invNumber, parseFloat(initialInvoiceAmount), normStartDate]
      );
    }

    clearRouteCache();

    return sendSuccess(
      res,
      {
        tenantId,
        name,
        slug: derivedSlug,
        primaryDomain: targetDomain,
        dbName,
        adminEmail: email,
        initialPassword,
        licenseKey,
      },
      "Tenant provisioned successfully",
      201
    );
  } catch (err: any) {
    return sendError(res, 500, "TENANT_CREATION_FAILED", err.message || "Tenant provisioning failed.");
  }
});

// 4. Get Tenant Details
router.get("/tenants/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute<any[]>(
      `SELECT t.*, d.domain AS primaryDomain 
       FROM SaaSTenant t
       LEFT JOIN TenantDomain d ON t.id = d.tenantId AND d.isPrimary = 1
       WHERE t.id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) {
      return sendError(res, 404, "TENANT_NOT_FOUND", "Tenant not found.");
    }
    const tenant = rows[0];
    delete tenant.password;

    const [domains] = await pool.execute<any[]>(
      "SELECT * FROM TenantDomain WHERE tenantId = ? ORDER BY isPrimary DESC, createdAt ASC",
      [id]
    );
    tenant.domains = domains;

    return sendSuccess(res, tenant);
  } catch (err: any) {
    return sendError(res, 500, "FETCH_TENANT_FAILED", err.message || "Failed to retrieve tenant details.");
  }
});

export default router;
