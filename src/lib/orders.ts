/**
 * Order storage — PostgreSQL.
 * Stores order info (email, name, quantity) indexed by Stripe session ID.
 */

import { getDb } from './db';

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

function rowToOrder(row: any): OrderRecord {
  return {
    stripeSessionId: row.stripe_session_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    quantity: row.quantity,
    total: row.total,
    shippingAddress: row.shipping_address || '',
    city: row.city || '',
    postalCode: row.postal_code || '',
    country: row.country || '',
    carrier: row.carrier || undefined,
    trackingNumber: row.tracking_number || undefined,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

/** Save a new order after Stripe payment (idempotent on session id) */
export async function saveOrder(record: OrderRecord): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO orders (stripe_session_id, customer_email, customer_name, quantity, total,
       shipping_address, city, postal_code, country, carrier, tracking_number, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (stripe_session_id) DO UPDATE SET
       customer_email = EXCLUDED.customer_email,
       customer_name = EXCLUDED.customer_name,
       quantity = EXCLUDED.quantity,
       total = EXCLUDED.total,
       shipping_address = EXCLUDED.shipping_address,
       city = EXCLUDED.city,
       postal_code = EXCLUDED.postal_code,
       country = EXCLUDED.country,
       carrier = EXCLUDED.carrier,
       tracking_number = EXCLUDED.tracking_number,
       status = EXCLUDED.status`,
    [
      record.stripeSessionId,
      record.customerEmail,
      record.customerName,
      record.quantity,
      record.total,
      record.shippingAddress,
      record.city,
      record.postalCode,
      record.country,
      record.carrier || null,
      record.trackingNumber || null,
      record.status,
      record.createdAt || new Date().toISOString(),
    ],
  );
}

/** Find an order by its Stripe session ID */
export async function findOrder(sessionId: string): Promise<OrderRecord | null> {
  const db = await getDb();
  const res = await db.query('SELECT * FROM orders WHERE stripe_session_id = $1', [sessionId]);
  if (res.rows.length === 0) return null;
  return rowToOrder(res.rows[0]);
}

/** List all orders, most recent first */
export async function listOrders(): Promise<OrderRecord[]> {
  const db = await getDb();
  const res = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
  return res.rows.map(rowToOrder);
}

/** Mark an order as shipped with tracking info */
export async function markShipped(
  sessionId: string,
  trackingNumber: string,
  carrier: string,
): Promise<OrderRecord | null> {
  const db = await getDb();
  const res = await db.query(
    `UPDATE orders SET status = 'shipped', tracking_number = $2, carrier = $3
     WHERE stripe_session_id = $1 RETURNING *`,
    [sessionId, trackingNumber, carrier],
  );
  if (res.rows.length === 0) return null;
  return rowToOrder(res.rows[0]);
}