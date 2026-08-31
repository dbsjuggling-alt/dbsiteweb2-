/**
 * Promo codes — JSON file-based.
 *
 * File: ~/.hermes/data/dbs-promocodes.json
 *
 * Manage codes via page admin or directly editing the JSON file.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA_DIR = join(homedir(), '.hermes', 'data');
const DATA_FILE = join(DATA_DIR, 'dbs-promocodes.json');

export interface PromoCode {
  code: string;                    // e.g. "WELCOME10", uppercase
  discountType: 'percentage' | 'fixed';
  discountValue: number;           // e.g. 10 for 10% or 100 for 1€
  minQuantity: number;             // minimum balls for this code (default 1)
  maxUses: number;                 // max total uses (0 = unlimited)
  usedCount: number;
  expiresAt?: string;              // ISO date string, optional
  active: boolean;
  label: string;                   // displayed to customer, e.g. "-10%"
}

async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readAll(): Promise<PromoCode[]> {
  try {
    await ensureDir();
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // Seed with a demo code on first access
    const defaults: PromoCode[] = [
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
    await writeAll(defaults);
    return defaults;
  }
}

async function writeAll(codes: PromoCode[]): Promise<void> {
  await ensureDir();
  await writeFile(DATA_FILE, JSON.stringify(codes, null, 2), 'utf-8');
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

/** Compute discounted price (in cents). Returns null if invalid */
export function applyDiscount(
  totalCents: number,
  promo: PromoCode,
): { discountedCents: number; savedCents: number } {
  let saved = 0;
  if (promo.discountType === 'percentage') {
    saved = Math.round(totalCents * promo.discountValue / 100);
  } else {
    // Fixed discount in cents
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

/** List all promo codes (for admin) */
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