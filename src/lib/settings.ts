/**
 * Store settings — unit price, shipping cost, max quantity.
 * Persisted to JSON so they can be changed from the admin page
 * without touching the code.
 *
 * File: ~/.hermes/data/dbs-settings.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA_DIR = join(homedir(), '.hermes', 'data');
const DATA_FILE = join(DATA_DIR, 'dbs-settings.json');

export interface StoreSettings {
  unitPriceCents: number;  // price of one ball, in cents (default 500 = 5€)
  shippingCents: number;   // shipping cost, in cents (default 50 = 0.50€)
  maxQuantity: number;     // max balls per order (default 50)
}

export const DEFAULT_SETTINGS: StoreSettings = {
  unitPriceCents: 500,
  shippingCents: 50,
  maxQuantity: 50,
};

async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    try { await mkdir(DATA_DIR, { recursive: true }); } catch {}
  }
}

export async function getSettings(): Promise<StoreSettings> {
  try {
    await ensureDir();
    const raw = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      unitPriceCents: typeof parsed.unitPriceCents === 'number' ? parsed.unitPriceCents : DEFAULT_SETTINGS.unitPriceCents,
      shippingCents: typeof parsed.shippingCents === 'number' ? parsed.shippingCents : DEFAULT_SETTINGS.shippingCents,
      maxQuantity: typeof parsed.maxQuantity === 'number' ? parsed.maxQuantity : DEFAULT_SETTINGS.maxQuantity,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: StoreSettings): Promise<void> {
  try {
    await ensureDir();
    await writeFile(DATA_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Silent — filesystem may not be writable (Railway)
  }
}