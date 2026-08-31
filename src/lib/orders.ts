/**
 * Simple order storage — JSON file-based.
 * Saves order info (email, name, quantity) indexed by Stripe session ID.
 * Lets SendCloud webhook look up customer details when tracking is available.
 *
 * File: ~/.hermes/data/dbs-orders.json (persistent across restarts)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA_DIR = join(homedir(), '.hermes', 'data');
const DATA_FILE = join(DATA_DIR, 'dbs-orders.json');

export interface OrderRecord {
  stripeSessionId: string;
  customerEmail: string;
  customerName: string;
  quantity: number;
  total: number;
  shippingAddress: string;
  city: string;
  postalCode: string;
  country: string;
  carrier?: string;
  trackingNumber?: string;
  status: 'confirmed' | 'shipped' | 'delivered';
  createdAt: string; // ISO
}

async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readAll(): Promise<OrderRecord[]> {
  try {
    await ensureDir();
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(orders: OrderRecord[]): Promise<void> {
  await ensureDir();
  await writeFile(DATA_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

/** Save a new order after Stripe payment */
export async function saveOrder(record: OrderRecord): Promise<void> {
  const orders = await readAll();
  // Replace if already exists (idempotent)
  const idx = orders.findIndex(o => o.stripeSessionId === record.stripeSessionId);
  if (idx >= 0) {
    orders[idx] = record;
  } else {
    orders.push(record);
  }
  await writeAll(orders);
}

/** Find an order by its Stripe session ID */
export async function findOrder(sessionId: string): Promise<OrderRecord | null> {
  const orders = await readAll();
  return orders.find(o => o.stripeSessionId === sessionId) || null;
}

/** Mark an order as shipped with tracking info */
export async function markShipped(
  sessionId: string,
  trackingNumber: string,
  carrier: string,
): Promise<OrderRecord | null> {
  const orders = await readAll();
  const order = orders.find(o => o.stripeSessionId === sessionId);
  if (!order) return null;

  order.status = 'shipped';
  order.trackingNumber = trackingNumber;
  order.carrier = carrier;
  order.createdAt = order.createdAt || new Date().toISOString();
  await writeAll(orders);
  return order;
}