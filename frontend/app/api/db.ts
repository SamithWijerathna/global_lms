import mysql from "mysql2/promise";
import { headers } from "next/headers";
import { healDatabase } from "./dbHealer";

declare global {
  var mysqlPool: mysql.Pool | undefined;
  var mysqlPoolConfigKey: string | undefined;
  var centralPool: mysql.Pool | undefined;
  var tenantPools: Map<string, mysql.Pool> | undefined;
  var tenantRouteCache: Map<string, { dbName: string; expiresAt: number }> | undefined;
}

const host = process.env.MYSQL_HOST || process.env.DB_HOST || "127.0.0.1";
const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306);
const user = process.env.MYSQL_USER || process.env.DB_USER || "root";
const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? "samith";
const defaultDb = process.env.MYSQL_DATABASE || process.env.DB_NAME || "cloudwave_lms";
const centralDb = process.env.CENTRAL_DB_NAME || "cloudwave_lms_central";

if (!global.tenantPools) {
  global.tenantPools = new Map<string, mysql.Pool>();
}
if (!global.tenantRouteCache) {
  global.tenantRouteCache = new Map<string, { dbName: string; expiresAt: number }>();
}

function getCentralPool(): mysql.Pool {
  if (!global.centralPool) {
    global.centralPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: centralDb,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return global.centralPool;
}

function getPoolForDatabase(dbName: string): mysql.Pool {
  const pools = global.tenantPools!;
  if (pools.has(dbName)) {
    return pools.get(dbName)!;
  }

  const newPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  pools.set(dbName, newPool);

  // Trigger schema healing asynchronously on pool initialization
  healDatabase(newPool).catch((err) => {
    console.error(`[DB HEAL ERROR on ${dbName}]`, err);
  });

  return newPool;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function resolveTenantDbName(domain?: string, slug?: string): Promise<string | null> {
  const key = (domain || slug || "").toLowerCase().trim();
  if (!key) return null;

  const cache = global.tenantRouteCache!;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.dbName;
  }

  try {
    const cp = getCentralPool();
    let dbName: string | null = null;

    if (domain) {
      const [rows] = await cp.execute<any[]>(
        "SELECT tenantDbName FROM TenantRouting WHERE LOWER(domain) = ? AND status = 'active' LIMIT 1",
        [domain.toLowerCase()]
      );
      if (rows.length > 0) {
        dbName = rows[0].tenantDbName;
      }
    }

    if (!dbName && slug) {
      const [rows] = await cp.execute<any[]>(
        "SELECT tenantDbName FROM TenantRouting WHERE LOWER(tenantSlug) = ? AND status = 'active' LIMIT 1",
        [slug.toLowerCase()]
      );
      if (rows.length > 0) {
        dbName = rows[0].tenantDbName;
      } else {
        const [tenantRows] = await cp.execute<any[]>(
          "SELECT dbName FROM SaaSTenant WHERE LOWER(slug) = ? AND status = 'active' LIMIT 1",
          [slug.toLowerCase()]
        );
        if (tenantRows.length > 0) {
          dbName = tenantRows[0].dbName;
        }
      }
    }

    if (dbName) {
      cache.set(key, { dbName, expiresAt: Date.now() + CACHE_TTL_MS });
      return dbName;
    }
  } catch (err: any) {
    console.warn("[TENANT DB RESOLUTION WARN]", err.message);
  }

  return null;
}

export async function getDBConnection(contextOrReq?: Request | Headers | string): Promise<mysql.Pool> {
  // Direct DB name string override
  if (typeof contextOrReq === "string") {
    if (contextOrReq.startsWith("lms_tenant_") || contextOrReq === defaultDb) {
      return getPoolForDatabase(contextOrReq);
    }
  }

  let domain: string | null = null;
  let slug: string | null = null;

  if (typeof contextOrReq === "string") {
    domain = contextOrReq.replace(/:\d+$/, "").toLowerCase().trim();
  } else if (contextOrReq && "headers" in contextOrReq) {
    const h = contextOrReq.headers;
    domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
    slug = h.get("x-tenant-slug");
  } else if (contextOrReq && typeof (contextOrReq as any).get === "function") {
    const h = contextOrReq as Headers;
    domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
    slug = h.get("x-tenant-slug");
  } else {
    try {
      const h = await headers();
      domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
      slug = h.get("x-tenant-slug");
    } catch (_) {
      // In non-request context (e.g. background tasks or build time)
    }
  }

  if (domain) {
    domain = domain.replace(/:\d+$/, "").toLowerCase().trim();
  }
  if (slug) {
    slug = slug.toLowerCase().trim();
  }

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "lms.circleone.asia").toLowerCase();

  // Root domain and localhost connect to default database unless a specific slug is set
  const isRootOrLocal =
    !domain ||
    domain === rootDomain ||
    domain.includes("localhost") ||
    domain.includes("127.0.0.1") ||
    domain.startsWith("api.") ||
    domain.startsWith("cname.");

  if (!isRootOrLocal || slug) {
    const tenantDb = await resolveTenantDbName(domain || undefined, slug || undefined);
    if (tenantDb) {
      return getPoolForDatabase(tenantDb);
    }
  }

  return getPoolForDatabase(defaultDb);
}

export async function query<T = any>(sql: string, params: any[] = [], contextOrReq?: any): Promise<T[]> {
  const pool = await getDBConnection(contextOrReq);
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function authorize(req: Request, db?: any) {
  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const secret = process.env.PUBLIC_API_SECRET_TOKEN || process.env.NEXT_PUBLIC_API_SECRET_TOKEN;
    if (token && (secret ? token === secret : true)) {
      return null;
    }
  }

  // 2. Check admin_session cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((pair) => pair.length === 2)
  );
  const sessionUuid = cookies["admin_session"];

  if (sessionUuid) {
    if (db) {
      try {
        const [rows] = await db.query(
          "SELECT uuid FROM admin_users WHERE uuid = ?",
          [sessionUuid]
        );
        if ((rows as any[]).length > 0) {
          return null;
        }
      } catch (err) {
        return null;
      }
    } else {
      return null;
    }
  }

  // 3. Check student session cookie
  const accessToken = cookies["accessToken"] || cookies["authToken"];
  if (accessToken) {
    return null;
  }

  return { error: "Unauthorized", status: 401 };
}

export interface TenantMeta {
  tenantId: string;
  slug: string;
  dbName: string;
  name: string;
  maxStorageMb: number;
  maxMediaStorageGb: number;
}

export async function getTenantMeta(contextOrReq?: Request | Headers | string): Promise<TenantMeta> {
  let domain: string | null = null;
  let slug: string | null = null;

  if (typeof contextOrReq === "string") {
    domain = contextOrReq.replace(/:\d+$/, "").toLowerCase().trim();
  } else if (contextOrReq && "headers" in contextOrReq) {
    const h = contextOrReq.headers;
    domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
    slug = h.get("x-tenant-slug");
  } else if (contextOrReq && typeof (contextOrReq as any).get === "function") {
    const h = contextOrReq as Headers;
    domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
    slug = h.get("x-tenant-slug");
  } else {
    try {
      const h = await headers();
      domain = h.get("x-custom-domain") || h.get("x-tenant-domain") || h.get("x-forwarded-host") || h.get("host");
      slug = h.get("x-tenant-slug");
    } catch (_) {}
  }

  if (domain) domain = domain.replace(/:\d+$/, "").toLowerCase().trim();
  if (slug) slug = slug.toLowerCase().trim();

  try {
    const cp = getCentralPool();
    if (domain) {
      const [rows] = await cp.execute<any[]>(
        `SELECT t.id as tenantId, t.slug, t.dbName, t.name, 
                COALESCE(t.maxStorageMb, 500) as maxStorageMb, 
                COALESCE(t.maxMediaStorageGb, 0) as maxMediaStorageGb 
         FROM TenantRouting r
         JOIN SaaSTenant t ON r.tenantId = t.id
         WHERE LOWER(r.domain) = ? AND r.status = 'active' LIMIT 1`,
        [domain]
      );
      if (rows.length > 0) return rows[0];
    }
    if (slug) {
      const [rows] = await cp.execute<any[]>(
        `SELECT t.id as tenantId, t.slug, t.dbName, t.name, 
                COALESCE(t.maxStorageMb, 500) as maxStorageMb, 
                COALESCE(t.maxMediaStorageGb, 0) as maxMediaStorageGb 
         FROM SaaSTenant t
         WHERE LOWER(t.slug) = ? AND t.status = 'active' LIMIT 1`,
        [slug]
      );
      if (rows.length > 0) return rows[0];
    }
  } catch (err: any) {
    console.warn("[TENANT META WARN]", err.message);
  }

  return {
    tenantId: "default",
    slug: "default",
    dbName: defaultDb,
    name: "Default Tenant",
    maxStorageMb: 500,
    maxMediaStorageGb: 0,
  };
}