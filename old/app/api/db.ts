import mysql from "mysql2/promise";

declare global {
  var mysqlPool: mysql.Pool | undefined;
  var mysqlPoolConfigKey: string | undefined;
}

export function getDBConnection() {
  const host = process.env.MYSQL_HOST || process.env.DB_HOST || "127.0.0.1";
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306);
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD;
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;

  if (!user || password === undefined || !database) {
    throw new Error(
      "Missing required database credentials in environment variables (MYSQL_USER/DB_USER, MYSQL_PASSWORD/DB_PASSWORD, MYSQL_DATABASE/DB_NAME). Please check your .env file."
    );
  }

  const configKey = `${host}:${port}:${user}:${password}:${database}`;

  if (!global.mysqlPool || global.mysqlPoolConfigKey !== configKey) {
    if (global.mysqlPool) {
      global.mysqlPool.end().catch(() => {});
    }

    global.mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    global.mysqlPoolConfigKey = configKey;
  }
  return global.mysqlPool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getDBConnection();
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