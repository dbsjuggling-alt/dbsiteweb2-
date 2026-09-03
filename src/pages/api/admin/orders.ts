/**
 * Admin API — list orders.
 * GET /api/admin/orders?token=XXX
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { listOrders } from '../../../lib/orders';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const orders = await listOrders();
    return new Response(JSON.stringify({ orders }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};