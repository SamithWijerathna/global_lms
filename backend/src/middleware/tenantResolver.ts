import { Request, Response, NextFunction } from "express";
import { getTenantRouting, getTenantPool, dbStorage } from "../lib/db";
import { sendError } from "../lib/routeUtils";

export interface TenantContext {
  id: string;
  slug: string;
  dbName: string;
  domain: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

// Paths that never need a tenant context
const EXEMPT_PATHS = [
  "/api/v1/health",
  "/api/v1/saas-admin",
];

// Root/admin domains that should never be treated as tenant domains
const ROOT_DOMAINS = [
  process.env.ROOT_DOMAIN || "lms.circleone.asia",
  `api.${process.env.ROOT_DOMAIN || "lms.circleone.asia"}`,
  `cname.${process.env.ROOT_DOMAIN || "lms.circleone.asia"}`,
  "localhost",
  "127.0.0.1",
];

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  try {
    const rawHost = (
      (req.headers["x-forwarded-host"] as string) ||
      req.headers.host ||
      ""
    )
      .toLowerCase()
      .split(":")[0];

    // 1. Skip resolution for root/admin domains — pass straight through
    if (ROOT_DOMAINS.includes(rawHost)) {
      return next();
    }

    // 2. Skip exempt API paths regardless of domain
    const isExempt = EXEMPT_PATHS.some((path) => req.path.startsWith(path));
    if (isExempt) {
      return next();
    }

    const explicitTenantId = req.headers["x-tenant-id"] as string | undefined;
    const explicitSlug = req.headers["x-tenant-slug"] as string | undefined;

    // 3. Resolve tenant routing info
    const route = await getTenantRouting({
      host: rawHost,
      tenantId: explicitTenantId,
      slug: explicitSlug,
    });

    if (route) {
      req.tenant = {
        id: route.tenantId,
        slug: route.tenantSlug,
        dbName: route.tenantDbName,
        domain: rawHost,
      };

      const tenantPool = getTenantPool(route.tenantDbName);
      return dbStorage.run(tenantPool, () => next());
    }

    // 4. No tenant found for this domain
    return sendError(
      res,
      404,
      "TENANT_NOT_FOUND",
      `No active LMS tenant found matching domain '${rawHost}'. Please verify your custom domain or subdomain configuration.`
    );
  } catch (err: any) {
    return sendError(res, 500, "TENANT_RESOLUTION_FAILED", err.message || "Failed to resolve tenant.");
  }
}

