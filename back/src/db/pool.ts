import pg from 'pg';
import { env } from '../config/env.js';

// Readable JS values: counts/bigint ids as numbers, numeric as numbers,
// timestamptz as ISO-8601 strings (UTC). jsonb is parsed by pg already.
const parseTimestamp = pg.types.getTypeParser(pg.types.builtins.TIMESTAMPTZ);
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value) => (parseTimestamp(value) as Date).toISOString());

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10, options: '-c TimeZone=UTC' });
// An idle connection dropped by the server (restart, `db reset`) must not crash the API;
// the pool simply opens a new one on the next query.
pool.on('error', (error) => console.error('[db] koneksi idle terputus:', error.message));

/** Anything that can run a query: the pool, or a client inside a transaction. */
export type Db = pg.Pool | pg.PoolClient;
export type Tx = pg.PoolClient;
/** Marks a value for a jsonb column (arrays would otherwise be sent as Postgres arrays). */
export class Json {
  constructor(readonly value: unknown) {}
}
export const json = (value: unknown) => new Json(value);

export type SqlParam = string | number | boolean | null | Date | string[] | Json;

function normalize(params: SqlParam[]): unknown[] {
  return params.map((p) => (p instanceof Json ? JSON.stringify(p.value) : p));
}

/** SELECT → rows. Always parameterised ($1, $2 …), never string-built with user input. */
export async function all<T>(db: Db, sql: string, params: SqlParam[] = []): Promise<T[]> {
  const result = await db.query(sql, normalize(params));
  return result.rows as T[];
}

export async function one<T>(db: Db, sql: string, params: SqlParam[] = []): Promise<T | null> {
  return (await all<T>(db, sql, params))[0] ?? null;
}

/** INSERT / UPDATE / DELETE → affected row count. */
export async function run(db: Db, sql: string, params: SqlParam[] = []): Promise<number> {
  const result = await db.query(sql, normalize(params));
  return result.rowCount ?? 0;
}

/** All-or-nothing: COMMIT when `fn` resolves, ROLLBACK when it throws. */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
