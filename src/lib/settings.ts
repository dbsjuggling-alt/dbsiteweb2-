/**
 * Store settings — unit price, shipping cost, max quantity.
 * Stored in PostgreSQL so changes from the admin page survive redeploys.
 */

import { getDb } from './db';

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

const KEYS = {
  unitPriceCents: 'unit_price_cents',
  shippingCents: 'shipping_cents',
  maxQuantity: 'max_quantity',
} as const;

export async function getSettings(): Promise<StoreSettings> {
  try {
    const db = await getDb();
    const res = await db.query('SELECT key, value FROM settings');
    const map: Record<string, string> = {};
    for (const row of res.rows) map[row.key] = row.value;

    return {
      unitPriceCents: map[KEYS.unitPriceCents] !== undefined ? parseInt(map[KEYS.unitPriceCents], 10) : DEFAULT_SETTINGS.unitPriceCents,
      shippingCents: map[KEYS.shippingCents] !== undefined ? parseInt(map[KEYS.shippingCents], 10) : DEFAULT_SETTINGS.shippingCents,
      maxQuantity: map[KEYS.maxQuantity] !== undefined ? parseInt(map[KEYS.maxQuantity], 10) : DEFAULT_SETTINGS.maxQuantity,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: StoreSettings): Promise<void> {
  const db = await getDb();
  const entries: [string, string][] = [
    [KEYS.unitPriceCents, String(settings.unitPriceCents)],
    [KEYS.shippingCents, String(settings.shippingCents)],
    [KEYS.maxQuantity, String(settings.maxQuantity)],
  ];
  for (const [key, value] of entries) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
    );
  }
}