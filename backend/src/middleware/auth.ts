import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool, dbQuery, dbStorage, getTenantPool, CENTRAL_DB_NAME } from "../lib/db";
import { sendError } from "../lib/routeUtils";

const JWT_SECRET = process.env.JWT_SECRET || "global_lms_super_secret_jwt_key_2026_secure";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  tenantId?: string;
  isSuperAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication token missing or malformed.");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if Super Admin token
    if (decoded.isSuperAdmin) {
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        name: decoded.name || "Super Admin",
        role: "Super Admin",
        isSuperAdmin: true,
      };
      return next();
    }

    // Tenant user token
    const userId = decoded.userId || decoded.id || decoded.uuid;
    const tenantDbName = decoded.tenantDbName || req.tenant?.dbName;

    if (tenantDbName) {
      const tenantPool = getTenantPool(tenantDbName);
      return dbStorage.run(tenantPool, async () => {
        const users = await dbQuery<any[]>(
          "SELECT id, uuid, first_name, last_name, user_email, phone, batch FROM users WHERE id = ? OR uuid = ? LIMIT 1",
          [userId, userId]
        ).catch(() => []);

        if (users.length === 0) {
          return sendError(res, 401, "USER_NOT_FOUND", "User account not found in tenant database.");
        }

        const u = users[0];
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
        req.user = {
          id: u.uuid || String(u.id),
          email: u.user_email,
          name: fullName || "User",
          role: decoded.role || "student",
          tenantId: decoded.tenantId || req.tenant?.id,
          isSuperAdmin: false,
        };
        return next();
      });
    }

    return sendError(res, 401, "TENANT_CONTEXT_REQUIRED", "Tenant context missing from token.");
  } catch (err: any) {
    return sendError(res, 401, "INVALID_TOKEN", "Invalid or expired token.");
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    return sendError(res, 403, "FORBIDDEN", "Super Admin privileges required.");
  }
  return next();
}
