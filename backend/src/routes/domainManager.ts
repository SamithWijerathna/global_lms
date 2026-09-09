import { Router } from "express";
import crypto from "crypto";
import { exec } from "child_process";
import { pool, clearRouteCache } from "../lib/db";
import { checkCustomDomainDns } from "../lib/dnsVerifier";
import { sendSuccess, sendError } from "../lib/routeUtils";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const DEFAULT_CNAME = process.env.DEFAULT_CNAME_TARGET || "cname.globallms.com";
const CERTBOT_EMAIL = process.env.CERTBOT_EMAIL || "admin@circleone.asia";

/**
 * Provisions a Let's Encrypt SSL certificate for a custom domain using Certbot.
 * Runs in background — does NOT block the HTTP response.
 */
function provisionSslCertificate(domain: string): Promise<void> {
  const cmd = [
    `certbot --nginx`,
    `-d ${domain}`,
    `--non-interactive`,
    `--agree-tos`,
    `-m ${CERTBOT_EMAIL}`,
    `--redirect`,
    `--keep-until-expiring`,
  ].join(" ");

  console.log(`🔐 Starting SSL provisioning for: ${domain}`);
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
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

// 1. Get all domains for the active tenant
router.get("/", authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.id;
    if (!tenantId) {
      return sendError(res, 400, "TENANT_REQUIRED", "Tenant context is required.");
    }

    const [domains] = await pool.execute<any[]>(
      "SELECT * FROM TenantDomain WHERE tenantId = ? ORDER BY isPrimary DESC, createdAt ASC",
      [tenantId]
    );

    return sendSuccess(res, domains);
  } catch (err: any) {
    return sendError(res, 500, "FETCH_DOMAINS_FAILED", err.message || "Failed to fetch domains.");
  }
});

// 2. Add a new custom domain
router.post("/", authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.id;
    if (!tenantId) {
      return sendError(res, 400, "TENANT_REQUIRED", "Tenant context is required.");
    }

    const { domain } = req.body;
    if (!domain || typeof domain !== "string") {
      return sendError(res, 400, "INVALID_DOMAIN", "Domain name is required.");
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleanDomain.includes(".") || cleanDomain.length < 4) {
      return sendError(res, 400, "INVALID_DOMAIN_FORMAT", "Please provide a valid fully qualified domain name.");
    }

    // Check if domain is already registered
    const [existing] = await pool.execute<any[]>(
      "SELECT id, tenantId FROM TenantDomain WHERE LOWER(domain) = ? LIMIT 1",
      [cleanDomain]
    );
    if (existing.length > 0) {
      return sendError(res, 400, "DOMAIN_ALREADY_EXISTS", "This domain is already registered in Global LMS.");
    }

    const domainId = crypto.randomUUID();
    const verificationToken = crypto.randomBytes(16).toString("hex");

    await pool.execute(
      `INSERT INTO TenantDomain (id, tenantId, domain, type, cnameTarget, verificationToken, isVerified, isPrimary, sslStatus)
       VALUES (?, ?, ?, 'custom_domain', ?, ?, 0, 0, 'pending')`,
      [domainId, tenantId, cleanDomain, DEFAULT_CNAME, verificationToken]
    );

    return sendSuccess(
      res,
      {
        id: domainId,
        domain: cleanDomain,
        type: "custom_domain",
        cnameTarget: DEFAULT_CNAME,
        verificationToken,
        txtRecord: `globallms-verification=${verificationToken}`,
        isVerified: 0,
        sslStatus: "pending",
        instructions: {
          step1: `Log in to your DNS provider (e.g. Cloudflare, GoDaddy, Namecheap).`,
          step2: `Add a CNAME record with Host/Name pointing to '${DEFAULT_CNAME}' OR add a TXT record with value 'globallms-verification=${verificationToken}'.`,
          step3: `Click 'Verify DNS' to validate and activate your domain.`,
        },
      },
      "Custom domain added. Please configure DNS to verify.",
      201
    );
  } catch (err: any) {
    return sendError(res, 500, "ADD_DOMAIN_FAILED", err.message || "Failed to add domain.");
  }
});

// 3. Verify Custom Domain DNS / CNAME
router.post("/:id/verify", authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.id;
    const { id } = req.params;

    const [domainRows] = await pool.execute<any[]>(
      "SELECT * FROM TenantDomain WHERE id = ? AND tenantId = ? LIMIT 1",
      [id, tenantId]
    );
    if (domainRows.length === 0) {
      return sendError(res, 404, "DOMAIN_NOT_FOUND", "Domain not found for this tenant.");
    }

    const d = domainRows[0];
    if (d.type === "subdomain") {
      return sendSuccess(res, { verified: true, isVerified: 1, message: "Subdomain is automatically verified." });
    }

    // Run DNS verification check
    const dnsResult = await checkCustomDomainDns(d.domain, d.cnameTarget, d.verificationToken);

    if (dnsResult.verified) {
      // Mark domain as verified and active
      await pool.execute(
        "UPDATE TenantDomain SET isVerified = 1, sslStatus = 'active', lastCheckedAt = NOW() WHERE id = ?",
        [id]
      );

      // Fetch tenant info to register routing
      const [tenantRows] = await pool.execute<any[]>(
        "SELECT id, slug, dbName FROM SaaSTenant WHERE id = ? LIMIT 1",
        [tenantId]
      );
      if (tenantRows.length > 0) {
        const t = tenantRows[0];
        const routeId = crypto.randomUUID();
        await pool.execute(
          `INSERT INTO TenantRouting (id, domain, tenantId, tenantSlug, tenantDbName, status)
           VALUES (?, ?, ?, ?, ?, 'active')
           ON DUPLICATE KEY UPDATE tenantId = VALUES(tenantId), tenantSlug = VALUES(tenantSlug), tenantDbName = VALUES(tenantDbName), status = 'active'`,
          [routeId, d.domain.toLowerCase(), t.id, t.slug, t.dbName]
        );
      }

      clearRouteCache(d.domain);

      // Await SSL certificate provisioning before responding
      let sslProvisioned = false;
      try {
        await provisionSslCertificate(d.domain);
        sslProvisioned = true;
        // Update sslStatus to active now that cert is confirmed
        await pool.execute(
          "UPDATE TenantDomain SET sslStatus = 'active' WHERE id = ?",
          [id]
        );
      } catch (sslErr: any) {
        console.error(`⚠️ SSL provisioning failed for ${d.domain}:`, sslErr.message);
        await pool.execute(
          "UPDATE TenantDomain SET sslStatus = 'pending' WHERE id = ?",
          [id]
        );
      }

      return sendSuccess(res, {
        verified: true,
        isVerified: 1,
        sslStatus: sslProvisioned ? "active" : "pending",
        sslProvisioned,
        details: dnsResult,
        message: sslProvisioned
          ? "Domain verified and SSL certificate issued successfully!"
          : "Domain verified, but SSL certificate provisioning failed. Please retry.",
      });
    }

    await pool.execute("UPDATE TenantDomain SET lastCheckedAt = NOW() WHERE id = ?", [id]);

    return sendSuccess(res, {
      verified: false,
      isVerified: 0,
      sslStatus: "pending",
      details: dnsResult,
      message: dnsResult.message,
    });
  } catch (err: any) {
    return sendError(res, 500, "VERIFICATION_FAILED", err.message || "DNS verification check failed.");
  }
});

// 4. Set Domain as Primary
router.patch("/:id/primary", authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.id;
    const { id } = req.params;

    const [domainRows] = await pool.execute<any[]>(
      "SELECT * FROM TenantDomain WHERE id = ? AND tenantId = ? LIMIT 1",
      [id, tenantId]
    );
    if (domainRows.length === 0) {
      return sendError(res, 404, "DOMAIN_NOT_FOUND", "Domain not found.");
    }

    const d = domainRows[0];
    if (d.type === "custom_domain" && !d.isVerified) {
      return sendError(res, 400, "DOMAIN_UNVERIFIED", "Domain must be verified before setting as primary.");
    }

    // Reset all other domains to non-primary
    await pool.execute("UPDATE TenantDomain SET isPrimary = 0 WHERE tenantId = ?", [tenantId]);
    await pool.execute("UPDATE TenantDomain SET isPrimary = 1 WHERE id = ?", [id]);

    return sendSuccess(res, { success: true }, "Primary domain updated.");
  } catch (err: any) {
    return sendError(res, 500, "SET_PRIMARY_FAILED", err.message || "Failed to set primary domain.");
  }
});

// 5. Delete Custom Domain
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.id;
    const { id } = req.params;

    const [domainRows] = await pool.execute<any[]>(
      "SELECT * FROM TenantDomain WHERE id = ? AND tenantId = ? LIMIT 1",
      [id, tenantId]
    );
    if (domainRows.length === 0) {
      return sendError(res, 404, "DOMAIN_NOT_FOUND", "Domain not found.");
    }

    const d = domainRows[0];
    if (d.type === "subdomain") {
      return sendError(res, 400, "CANNOT_DELETE_SUBDOMAIN", "Default subdomain cannot be deleted.");
    }

    await pool.execute("DELETE FROM TenantDomain WHERE id = ?", [id]);
    await pool.execute("DELETE FROM TenantRouting WHERE domain = ?", [d.domain.toLowerCase()]);
    clearRouteCache(d.domain);

    return sendSuccess(res, { deleted: true }, "Custom domain removed.");
  } catch (err: any) {
    return sendError(res, 500, "DELETE_DOMAIN_FAILED", err.message || "Failed to delete custom domain.");
  }
});

export default router;
