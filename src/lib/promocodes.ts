/**
 * Promo codes — seeded in code, persisted to JSON for usage counts.
 *
 * Built-in codes (TEST99, WELCOME10) are always available.
 * Usage counts are persisted when possible but failures are silent
 * (important for Railway's ephemeral filesystem).
 *
 * File: ~/.hermes/data/dbs-promocodes.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA_DIR = join(homedir(), '.hermes', 'data');
const DATA_FILE = join(DATA_DIR, 'dbs-promocodes.json');

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

// Built-in seed codes — always available, cannot be removed
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

async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    try { await mkdir(DATA_DIR, { recursive: true }); } catch {}
  }
}

async function readAll(): Promise<PromoCode[]> {
  // Start with seed codes
  const merged = new Map<string, PromoCode>();
  for (const s of SEED_CODES) merged.set(s.code, { ...s });

  // Try to merge with persisted file (usage counts)
  try {
    await ensureDir();
    const raw = await readFile(DATA_FILE, 'utf-8');
    const persisted: PromoCode[] = JSON.parse(raw);
    for (const p of persisted) {
      // Merge: seed code → keep seed definition but restore usedCount
      // Custom code → add it
      if (merged.has(p.code)) {
        merged.set(p.code, { ...merged.get(p.code)!, usedCount: p.usedCount });
      } else {
        merged.set(p.code, p);
      }
    }
  } catch {
    // First run — seed codes are enough
  }

  return Array.from(merged.values());
}

async function writeAll(codes: PromoCode[]): Promise<void> {
  try {
    await ensureDir();
    await writeFile(DATA_FILE, JSON.stringify(codes, null, 2), 'utf-8');
  } catch {
    // Silent — filesystem may not be writable (Railway)
  }
}

/** Validate a promo code and return its details (or null if invalid) */
export async function validateCode(
  code: string,
  quantity: number,
): Promise<{ valid: boolean; reason?: string; promo?: PromoCode }> {
  const codes = await readAll();
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
  const codes = await readAll();
  const promo = codes.find(c => c.code === code.toUpperCase().trim());
  if (promo) {
    promo.usedCount += 1;
    await writeAll(codes);
  }
}

/** List all promo codes */
export async function listCodes(): Promise<PromoCode[]> {
  return readAll();
}

/** Add or update a promo code */
export async function saveCode(promo: PromoCode): Promise<void> {
  const codes = await readAll();
  const idx = codes.findIndex(c => c.code === promo.code);
  if (idx >= 0) {
    codes[idx] = promo;
  } else {
    codes.push(promo);
  }
  await writeAll(codes);
}