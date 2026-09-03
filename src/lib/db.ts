/**
 * PostgreSQL connection layer.
 * Reads DATABASE_URL (or DATABASE_PUBLIC_URL for local dev) from env.
 * Tables are created lazily on first use (CREATE TABLE IF NOT EXISTS).
 */

import pg from 'pg';

const { Pool } = pg;

let poolPromise: Promise<pg.Pool | null> | null = null;

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS orders (
  stripe_session_id TEXT PRIMARY KEY,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total REAL NOT NULL,
  shipping_address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promocodes (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  label TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  tracking_number TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log (created_at DESC);
`;

/** Get the pool, creating tables on first use. Returns null if unavailable (never throws). */
export async function getDb(): Promise<pg.Pool | null> {
  const url = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';
  if (!url) return null;

  if (!poolPromise) {
    poolPromise = (async () => {
      const isRailway = url.includes('railway') || url.includes('up.railway.app');
      const pool = new Pool({
        connectionString: url,
        ssl: isRailway ? { rejectUnauthorized: false } : undefined,
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 8000,
      });
      try {
        await pool.query('SELECT 1');
        await pool.query(INIT_SQL);
      } catch (err: any) {
        console.error('[db] Init failed:', err.message);
        pool.end().catch(() => {});
        poolPromise = null; // Allow retry on next call
        return null;
      }
      return pool;
    })();
  }
  return poolPromise;
}

/** Helper: run a callback with the DB, falls back to fallback value if DB unavailable. */
export async function withDb<T>(fn: (db: pg.Pool) => Promise<T>, fallback: T): Promise<T> {
  try {
    const db = await getDb();
    if (!db) return fallback;
    return await fn(db);
  } catch {
    return fallback;
  }
}

/** Quick check — used by admin diagnostics. Returns true when reachable. */
export async function dbHealth(): Promise<boolean> {
  try {
    const pool = await getDb();
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}