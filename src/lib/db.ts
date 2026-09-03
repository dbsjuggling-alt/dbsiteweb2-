/**
 * PostgreSQL connection layer.
 * Reads DATABASE_URL (or DATABASE_PUBLIC_URL for local dev) from env.
 * Tables are created lazily on first use (CREATE TABLE IF NOT EXISTS).
 */

import pg from 'pg';

const { Pool } = pg;

let poolPromise: Promise<pg.Pool> | null = null;

function buildPool(): pg.Pool {
  const url = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';
  const isRailway = url.includes('railway') || url.includes('up.railway.app');
  return new Pool({
    connectionString: url,
    // Railway Postgres requires SSL (self-signed) — rejectUnauthorized: false
    ssl: url && isRailway ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

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

/** Get the pool, creating tables on first use. */
export async function getDb(): Promise<pg.Pool> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = buildPool();
      try {
        await pool.query(INIT_SQL);
      } catch (err: any) {
        // If init fails (e.g. no DATABASE_URL), surface clearly
        console.error('[db] Could not initialize database:', err.message);
      }
      return pool;
    })();
  }
  return poolPromise;
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