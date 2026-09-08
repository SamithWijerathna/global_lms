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

const EXEMPT_PATHS = [
  "/api/v1/health",
  "/api/v1/saas-admin/login",
  "/api/v1/saas-admin/companies",
  "/api/v1/saas-admin/tenants",
];

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Skip exemption paths
    const isExempt = EXEMPT_PATHS.some((path) => req.path.startsWith(path));
    
    const rawHost = (
      (req.headers["x-forwarded-host"] as string) ||
      req.headers.host ||
      ""
    )
      .toLowerCase()
      .split(":")[0];

    const explicitTenantId = req.headers["x-tenant-id"] as string | undefined;
    const explicitSlug = req.headers["x-tenant-slug"] as string | undefined;

    // 2. Resolve tenant routing info
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

    if (isExempt) {
      return next();
    }

    // Tenant could not be resolved and endpoint requires a tenant context
    if (req.path.startsWith("/api/v1/saas-admin")) {
      return next();
    }

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
