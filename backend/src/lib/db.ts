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
    const cleanHost = params.host.toLowerCase().replace(/^www\./, "");
    const [domainRows] = await pool.execute<any[]>(
      "SELECT tenantId, tenantSlug, tenantDbName, status FROM TenantRouting WHERE (LOWER(domain) = ? OR LOWER(domain) = ?) AND status = 'active' LIMIT 1",
      [params.host.toLowerCase(), cleanHost]
    );
    rows = domainRows;

    if (rows.length === 0) {
      const [tdRows] = await pool.execute<any[]>(
        `SELECT t.id AS tenantId, t.slug AS tenantSlug, t.dbName AS tenantDbName, t.status 
         FROM TenantDomain d
         JOIN SaaSTenant t ON d.tenantId = t.id
         WHERE (LOWER(d.domain) = ? OR LOWER(d.domain) = ?) AND t.status = 'active' LIMIT 1`,
        [params.host.toLowerCase(), cleanHost]
      );
      rows = tdRows;
    }
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

    // Ensure admin_users table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        user_email VARCHAR(191) NOT NULL UNIQUE,
        user_password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        permission_id INT DEFAULT 1,
        theme_preference VARCHAR(50) DEFAULT 'light',
        profile_photo VARCHAR(255) DEFAULT NULL,
        create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default permission roles
    await conn.query(`
      INSERT INTO permission (id, role_name, data) VALUES
      (1, 'developer', '{"class": 15, "config": 15, "student": 15, "studypack": 15}'),
      (2, 'admin', '{"class": 15, "config": 15, "student": 15, "studypack": 15}'),
      (3, 'teacher', '{"class": 15, "config": 0, "student": 7, "studypack": 7}'),
      (4, 'accountant', '{"class": 0, "config": 0, "student": 7, "studypack": 0}')
      ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);
    `);

    // Seed default class_types
    await conn.query(`
      INSERT INTO class_types (type_code, type_name, description) VALUES
      ('theory', 'Theory', 'Theory Class'),
      ('revision', 'Revision', 'Revision Class'),
      ('physical', 'Paper', 'Paper Class'),
      ('revision+paper', 'Revision + Paper', 'Combined Revision & Paper Class'),
      ('other', 'Other', 'Other Special Class')
      ON DUPLICATE KEY UPDATE type_name = VALUES(type_name);
    `);

    // Seed default batches
    await conn.query(`
      INSERT INTO batches (batch_code, batch_name, description) VALUES
      ('2026AL', '2026 A/L', 'Batch for 2026 Advanced Level students'),
      ('2027AL', '2027 A/L', 'Batch for 2027 Advanced Level students')
      ON DUPLICATE KEY UPDATE batch_name = VALUES(batch_name);
    `);

    // Ensure system_settings table exists & seeded
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await conn.query(`
      INSERT INTO system_settings (setting_key, setting_value) VALUES
      ('monthly_target', '500000')
      ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
    `);

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
