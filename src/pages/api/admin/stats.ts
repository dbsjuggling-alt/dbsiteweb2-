/**
 * Admin API — store statistics.
 * GET /api/admin/stats?token=XXX
 *
 * Derives revenue, orders count, balls sold, top promos from orders + promocodes.
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { listOrders } from '../../../lib/orders';
import { listCodes } from '../../../lib/promocodes';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const orders = await listOrders();
    const promos = await listCodes();

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const totalOrders = orders.length;
    const totalBalls = orders.reduce((s, o) => s + o.quantity, 0);
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const shippedOrders = orders.filter(o => o.status === 'shipped' || o.status === 'delivered').length;
    const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;

    const monthOrders = orders.filter(o => o.createdAt >= thisMonth);
    const monthRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
    const monthBalls = monthOrders.reduce((s, o) => s + o.quantity, 0);

    const yearOrders = orders.filter(o => o.createdAt >= thisYear);
    const yearRevenue = yearOrders.reduce((s, o) => s + (o.total || 0), 0);

    // Top promo codes by usage
    const topPromos = promos
      .filter(p => p.usedCount > 0)
      .sort((a, b) => b.usedCount - a.usedCount)
      .slice(0, 10)
      .map(p => ({ code: p.code, label: p.label, usedCount: p.usedCount }));

    return new Response(JSON.stringify({
      totalOrders, totalBalls, totalRevenue: Math.round(totalRevenue * 100) / 100,
      shippedOrders, confirmedOrders,
      monthOrders: monthOrders.length, monthRevenue: Math.round(monthRevenue * 100) / 100, monthBalls,
      yearOrders: yearOrders.length, yearRevenue: Math.round(yearRevenue * 100) / 100,
      topPromos,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};