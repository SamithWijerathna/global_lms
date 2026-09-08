import mysql from "mysql2/promise";
import { AsyncLocalStorage } from "async_hooks";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

export const CENTRAL_DB_NAME = process.env.DB_NAME || "cloudwave_lms_central";

// Central database pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: CENTRAL_DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// Tenant pools pool-cache
const tenantPools = new Map<string, mysql.Pool>();

export function getTenantPool(dbName: string): mysql.Pool {
  if (tenantPools.has(dbName)) {
    return tenantPools.get(dbName)!;
  }
  const newPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  tenantPools.set(dbName, newPool);
  return newPool;
}

// AsyncLocalStorage storage for tenant-bound connection execution
export const dbStorage = new AsyncLocalStorage<mysql.Pool>();

export async function dbQuery<T = any>(sql: string, params?: any[]): Promise<T> {
  const activePool = dbStorage.getStore() || pool;
  const [rows] = await activePool.execute(sql, params);
  return rows as T;
}

// Routing cache for sub-millisecond resolution
interface RouteCacheEntry {
  tenantId: string;
  tenantSlug: string;
  tenantDbName: string;
  status: string;
  expiresAt: number;
}
const routeCache = new Map<string, RouteCacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function getTenantRouting(params: { host?: string; tenantId?: string; slug?: string }): Promise<RouteCacheEntry | null> {
  const cacheKey = (params.host || params.slug || params.tenantId || "").toLowerCase();
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  let rows: any[] = [];
  if (params.host) {
    const [domainRows] = await pool.execute<any[]>(
      "SELECT tenantId, tenantSlug, tenantDbName, status FROM TenantRouting WHERE LOWER(domain) = ? AND status = 'active' LIMIT 1",
      [params.host.toLowerCase()]
    );
    rows = domainRows;
  }

  if (rows.length === 0 && params.slug) {
    const [slugRows] = await pool.execute<any[]>(
      "SELECT id AS tenantId, slug AS tenantSlug, dbName AS tenantDbName, status FROM SaaSTenant WHERE LOWER(slug) = ? AND status = 'active' LIMIT 1",
      [params.slug.toLowerCase()]
    );
    rows = slugRows;
  }

  if (rows.length === 0 && params.tenantId) {
    const [idRows] = await pool.execute<any[]>(
      "SELECT id AS tenantId, slug AS tenantSlug, dbName AS tenantDbName, status FROM SaaSTenant WHERE id = ? AND status = 'active' LIMIT 1",
      [params.tenantId]
    );
    rows = idRows;
  }

  if (rows.length > 0) {
    const item = rows[0];
    const entry: RouteCacheEntry = {
      tenantId: item.tenantId,
      tenantSlug: item.tenantSlug,
      tenantDbName: item.tenantDbName,
      status: item.status,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    routeCache.set(cacheKey, entry);
    if (params.host) routeCache.set(params.host.toLowerCase(), entry);
    if (item.tenantSlug) routeCache.set(item.tenantSlug.toLowerCase(), entry);
    if (item.tenantId) routeCache.set(item.tenantId, entry);
    return entry;
  }

  return null;
}

export function clearRouteCache(key?: string) {
  if (key) {
    routeCache.delete(key.toLowerCase());
  } else {
    routeCache.clear();
  }
}

// Database schema cloner for provisioning new tenant databases
export async function cloneTenantSchema(targetDb: string): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${targetDb}\``);

    const possiblePaths = [
      path.join(__dirname, "../../cloudwave_lms_tenant.sql"),
      path.join(__dirname, "../cloudwave_lms_tenant.sql"),
      path.join(process.cwd(), "cloudwave_lms_tenant.sql"),
      path.join(process.cwd(), "backend/cloudwave_lms_tenant.sql"),
    ];

    const sqlPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!sqlPath) {
      console.error("Tenant template SQL schema not found.");
      return false;
    }

    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    const queries = sqlContent
      .split(";")
      .map((q) => q.trim())
      .filter((q) => {
        if (q.length === 0) return false;
        if (q.startsWith("--") || q.startsWith("/*") || q.startsWith("#")) return false;
        const upper = q.toUpperCase();
        if (upper.startsWith("CREATE DATABASE") || upper.startsWith("USE ")) return false;
        return upper.startsWith("CREATE TABLE");
      })
      .map((q) => q.replace(/CREATE TABLE(?! IF NOT EXISTS)/i, "CREATE TABLE IF NOT EXISTS"));

    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const query of queries) {
      try {
        await conn.query(query);
      } catch (err: any) {
        console.warn(`DDL warning on ${targetDb}:`, err.message);
      }
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log(`Successfully initialized tenant database schema for: ${targetDb}`);
    return true;
  } catch (err) {
    console.error(`Failed to initialize tenant database ${targetDb}:`, err);
    return false;
  } finally {
    try {
      await conn.query(`USE \`${CENTRAL_DB_NAME}\``);
    } catch (_) {}
    conn.release();
  }
}
