import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool: Pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4',
  connectionLimit: 10,
  // Store and read DATETIME as UTC strings ("2026-09-28 10:00:00"); the UI shows WIB.
  timezone: 'Z',
  dateStrings: true,
  decimalNumbers: true,
});

// CURRENT_TIMESTAMP defaults must be UTC as well.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/** Anything that can run a query: the pool, or a connection inside a transaction. */
export type Db = Pool | PoolConnection;
export type SqlParam = string | number | boolean | null;

/** SELECT → rows. Always parameterised (`?` placeholders), never string-built. */
export async function all<T>(db: Db, sql: string, params: SqlParam[] = []): Promise<T[]> {
  const [rows] = await db.execute<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function one<T>(db: Db, sql: string, params: SqlParam[] = []): Promise<T | null> {
  return (await all<T>(db, sql, params))[0] ?? null;
}

/** INSERT / UPDATE / DELETE. */
export async function run(db: Db, sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
  const [result] = await db.execute<ResultSetHeader>(sql, params);
  return result;
}

/** All-or-nothing: COMMIT when `fn` resolves, ROLLBACK when it throws. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/** JSON columns come back as strings on MariaDB (JSON = LONGTEXT). */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
