/**
 * Admin API — store settings (unit price, shipping, max qty).
 * GET  /api/admin/settings?token=XXX  → read
 * POST /api/admin/settings?token=XXX  → update
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { getSettings, saveSettings, DEFAULT_SETTINGS, StoreSettings } from '../../../lib/settings';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const settings = await getSettings();
    return new Response(JSON.stringify({ settings }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const body = await request.json();
    const settings: StoreSettings = {
      unitPriceCents: Math.max(100, Math.min(10000, parseInt(body.unitPriceCents, 10) || DEFAULT_SETTINGS.unitPriceCents)),
      shippingCents: Math.max(0, Math.min(5000, parseInt(body.shippingCents, 10) || DEFAULT_SETTINGS.shippingCents)),
      maxQuantity: Math.max(1, Math.min(200, parseInt(body.maxQuantity, 10) || DEFAULT_SETTINGS.maxQuantity)),
    };
    await saveSettings(settings);
    return new Response(JSON.stringify({ success: true, settings }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};