import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { exec } from "child_process";
import { pool, getTenantPool, dbStorage, dbQuery, cloneTenantSchema, clearRouteCache } from "../lib/db";
import { checkCustomDomainDns } from "../lib/dnsVerifier";
import { sendSuccess, sendError } from "../lib/routeUtils";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "global_lms_super_secret_jwt_key_2026_secure";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "lms.circleone.asia";
const DEFAULT_CNAME = process.env.DEFAULT_CNAME_TARGET || "cname.lms.circleone.asia";
const CERTBOT_EMAIL = process.env.CERTBOT_EMAIL || "admin@circleone.asia";
const SSL_SCRIPT = process.env.SSL_SCRIPT_PATH || "/var/www/global_lms/backend/scripts/add-tenant-ssl.sh";

/**
 * Provisions a Let's Encrypt SSL cert for a custom tenant domain.
 * Calls add-tenant-ssl.sh which:
 *   1. Issues cert via certbot webroot (no per-domain nginx files created)
 *   2. Adds the domain → cert mapping to the single tenants-catchall.conf
 *   3. Reloads nginx
 * Returns a Promise — awaited before DB provisioning begins.
 */
function provisionSslCertificate(domain: string): Promise<void> {
  const cmd = `bash "${SSL_SCRIPT}" "${domain}" "${CERTBOT_EMAIL}"`;

  console.log(`🔐 Starting SSL provisioning for: ${domain}`);
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ SSL provisioning failed for ${domain}:`, err.message);
        console.error(stderr);
        reject(new Error(`SSL certificate provisioning failed for '${domain}': ${stderr || err.message}`));
      } else {
        console.log(`✅ SSL certificate issued for ${domain}`);
        console.log(stdout);
        resolve();
      }
    });
  });
}

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
    const domainExists = existing.length > 0;

    const dnsResult = await checkCustomDomainDns(cleanDomain, DEFAULT_CNAME, "");
    const verified = dnsResult.cnameMatched || dnsResult.verified;

    let message = verified
      ? `CNAME record is successfully pointed to ${DEFAULT_CNAME}`
      : `CNAME record for '${cleanDomain}' is not pointing to '${DEFAULT_CNAME}'.`;

    if (domainExists) {
      message += " (Note: This domain is already registered to a tenant in Volit.)";
    }

    return sendSuccess(res, {
      domain: cleanDomain,
      cnameTarget: DEFAULT_CNAME,
      verified,
      domainExists,
      currentCnames: dnsResult.currentCnames,
      message,
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

    // 3. Seed Tenant Default Admin User in admin_users AND users tables
    const tenantPool = getTenantPool(dbName);
    await dbStorage.run(tenantPool, async () => {
      const adminUuid = crypto.randomUUID();
      // Primary: seed admin_users for LMS Admin panel (/admin/login)
      await dbQuery(
        `INSERT INTO admin_users (uuid, first_name, last_name, user_email, user_password, role, permission_id, theme_preference)
         VALUES (?, 'Admin', ?, ?, ?, 'admin', 1, 'light')
         ON DUPLICATE KEY UPDATE user_password = VALUES(user_password)`,
        [adminUuid, name.trim(), email.trim().toLowerCase(), hashedPassword]
      );

      // Compatibility: also seed users table for student portal
      await dbQuery(
        `INSERT INTO users (uuid, student_id, first_name, last_name, user_email, phone, user_password, profile_completed)
         VALUES (?, 'ADM0001', 'Admin', ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE user_password = VALUES(user_password)`,
        [adminUuid, name.trim(), email.trim().toLowerCase(), phone || "0770000000", hashedPassword]
      );
    });

    // 4. Register Primary Domain in TenantDomain
    const domainId = crypto.randomUUID();
    const token = crypto.randomBytes(16).toString("hex");
    await pool.execute(
      `INSERT INTO TenantDomain (id, tenantId, domain, type, cnameTarget, verificationToken, isVerified, isPrimary, sslStatus)
       VALUES (?, ?, ?, 'custom_domain', ?, ?, 0, 1, 'pending')`,
      [domainId, tenantId, targetDomain, DEFAULT_CNAME, token]
    );

    // 5. Register in TenantRouting table
    const routeId = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO TenantRouting (id, domain, tenantId, tenantSlug, tenantDbName, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [routeId, targetDomain, tenantId, derivedSlug, dbName]
    );

    // 6. Non-blocking SSL provisioning attempt (doesn't fail creation if DNS is pending)
    let sslProvisioned = false;
    try {
      await provisionSslCertificate(targetDomain);
      sslProvisioned = true;
      await pool.execute(
        "UPDATE TenantDomain SET isVerified = 1, sslStatus = 'active' WHERE id = ?",
        [domainId]
      );
    } catch (sslErr: any) {
      console.warn(`ℹ️ SSL provisioning deferred for ${targetDomain} (DNS may be pending):`, sslErr.message);
    }

    // 7. Initial invoice creation if requested
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
        sslProvisioned,
        sslStatus: sslProvisioned ? "active" : "pending",
        instructions: {
          step1: `Add a CNAME record in your DNS provider pointing '${targetDomain}' to '${DEFAULT_CNAME}'.`,
          step2: `Once DNS propagates, SSL will activate automatically or can be verified in SaaS Admin.`,
        },
      },
      "Tenant provisioned successfully",
      201
    );
  } catch (err: any) {
    return sendError(res, 500, "TENANT_CREATION_FAILED", err.message || "Tenant provisioning failed.");
  }
});

// 3.1 Retry / Provision SSL for an existing tenant
router.post("/tenants/:id/provision-ssl", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [domainRows] = await pool.execute<any[]>(
      "SELECT id, domain, isPrimary FROM TenantDomain WHERE tenantId = ? AND isPrimary = 1 LIMIT 1",
      [id]
    );

    if (domainRows.length === 0) {
      return sendError(res, 404, "DOMAIN_NOT_FOUND", "No primary domain found for this tenant.");
    }

    const d = domainRows[0];
    await provisionSslCertificate(d.domain);
    await pool.execute(
      "UPDATE TenantDomain SET isVerified = 1, sslStatus = 'active', lastCheckedAt = NOW() WHERE id = ?",
      [d.id]
    );

    return sendSuccess(res, { domain: d.domain, sslStatus: "active" }, "SSL certificate issued successfully.");
  } catch (err: any) {
    return sendError(res, 502, "SSL_PROVISION_FAILED", `SSL provisioning failed: ${err.message}`);
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

// 5. Delete Tenant (Super Admin)
router.delete("/tenants/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute<any[]>(
      "SELECT id, name, dbName FROM SaaSTenant WHERE id = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 404, "TENANT_NOT_FOUND", "Tenant not found.");
    }

    const tenant = rows[0];

    // 1. Delete associated records in central database
    await pool.execute("DELETE FROM TenantRouting WHERE tenantId = ?", [id]);
    await pool.execute("DELETE FROM TenantDomain WHERE tenantId = ?", [id]);
    await pool.execute("DELETE FROM SaaSInvoice WHERE tenantId = ?", [id]);
    await pool.execute("DELETE FROM SaaSTenant WHERE id = ?", [id]);

    // 2. Drop tenant database schema (best-effort)
    if (tenant.dbName) {
      try {
        await pool.execute(`DROP DATABASE IF EXISTS \`${tenant.dbName}\``);
      } catch (dbErr: any) {
        console.error(`Failed to drop database ${tenant.dbName}:`, dbErr.message);
      }
    }

    clearRouteCache();

    return sendSuccess(res, { id, name: tenant.name }, "Tenant deleted successfully.");
  } catch (err: any) {
    return sendError(res, 500, "DELETE_TENANT_FAILED", err.message || "Failed to delete tenant.");
  }
});

export default router;
