/**
 * Promo codes — stored in PostgreSQL.
 * Seed codes (TEST99, WELCOME10) are always present, usage counts are live in DB.
 * Falls back gracefully when DB is unavailable.
 */

import { getDb, withDb } from './db';

export interface PromoCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minQuantity: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  label: string;
}

// Built-in seed codes — always available (inserted if missing)
const SEED_CODES: PromoCode[] = [
  {
    code: 'TEST99',
    discountType: 'percentage',
    discountValue: 99,
    minQuantity: 1,
    maxUses: 999,
    usedCount: 0,
    active: true,
    label: '-99%',
  },
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minQuantity: 1,
    maxUses: 50,
    usedCount: 0,
    active: true,
    label: '-10%',
  },
];

function rowToPromo(row: any): PromoCode {
  return {
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minQuantity: row.min_quantity,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at ? (row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at) : undefined,
    active: row.active,
    label: row.label || '',
  };
}

/** Ensure seed codes exist in the DB (no-op if already there) */
async function ensureSeeds(): Promise<void> {
  await withDb(async db => {
    for (const s of SEED_CODES) {
      await db.query(
        `INSERT INTO promocodes (code, discount_type, discount_value, min_quantity, max_uses, used_count, expires_at, active, label)
         VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8)
         ON CONFLICT (code) DO NOTHING`,
        [s.code, s.discountType, s.discountValue, s.minQuantity, s.maxUses, s.usedCount, s.active, s.label],
      );
    }
  }, undefined);
}

/** List all promo codes — falls back to seed codes if DB unavailable */
export async function listCodes(): Promise<PromoCode[]> {
  await ensureSeeds();
  const db = await getDb();
  if (!db) return [...SEED_CODES];
  try {
    const res = await db.query('SELECT * FROM promocodes ORDER BY code');
    return res.rows.map(rowToPromo);
  } catch {
    return [...SEED_CODES];
  }
}

/** Validate a promo code and return its details (or null if invalid) */
export async function validateCode(
  code: string,
  quantity: number,
): Promise<{ valid: boolean; reason?: string; promo?: PromoCode }> {
  const codes = await listCodes();
  const upper = code.toUpperCase().trim();
  const promo = codes.find(c => c.code === upper);

  if (!promo) {
    return { valid: false, reason: 'Code inexistant' };
  }
  if (!promo.active) {
    return { valid: false, reason: 'Code désactivé' };
  }
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    return { valid: false, reason: 'Code épuisé' };
  }
  if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
    return { valid: false, reason: 'Code expiré' };
  }
  if (quantity < promo.minQuantity) {
    return {
      valid: false,
      reason: `Minimum ${promo.minQuantity} balle${promo.minQuantity > 1 ? 's' : ''} requise`,
    };
  }

  return { valid: true, promo };
}

/** Compute discounted price (in cents) */
export function applyDiscount(
  totalCents: number,
  promo: PromoCode,
): { discountedCents: number; savedCents: number } {
  let saved = 0;
  if (promo.discountType === 'percentage') {
    saved = Math.round(totalCents * promo.discountValue / 100);
  } else {
    saved = Math.min(totalCents, promo.discountValue);
  }
  return {
    discountedCents: totalCents - saved,
    savedCents: saved,
  };
}

/** Increment usage count for a promo code */
export async function markUsed(code: string): Promise<void> {
  await withDb(
    db => db.query('UPDATE promocodes SET used_count = used_count + 1 WHERE code = $1', [code.toUpperCase().trim()]),
    undefined,
  );
}

/** Persist a promo code (insert or update) */
export async function saveCode(promo: PromoCode): Promise<void> {
  await withDb(
    db => db.query(
      `INSERT INTO promocodes (code, discount_type, discount_value, min_quantity, max_uses, used_count, expires_at, active, label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO UPDATE SET
         discount_type = EXCLUDED.discount_type,
         discount_value = EXCLUDED.discount_value,
         min_quantity = EXCLUDED.min_quantity,
         max_uses = EXCLUDED.max_uses,
         used_count = EXCLUDED.used_count,
         expires_at = EXCLUDED.expires_at,
         active = EXCLUDED.active,
         label = EXCLUDED.label`,
      [promo.code, promo.discountType, promo.discountValue, promo.minQuantity, promo.maxUses, promo.usedCount, promo.expiresAt || null, promo.active, promo.label || ''],
    ),
    undefined,
  );
}