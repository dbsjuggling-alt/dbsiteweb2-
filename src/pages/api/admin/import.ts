/**
 * TEMPORARY migration endpoint — imports local JSON data into Postgres.
 * Protected by ADMIN_TOKEN. DELETE AFTER USE.
 *
 * POST /api/admin/import?token=XXX
 * Body: { orders?: OrderRecord[], promocodes?: PromoCode[], settings?: StoreSettings }
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { saveOrder } from '../../../lib/orders';
import { saveCode } from '../../../lib/promocodes';
import { saveSettings } from '../../../lib/settings';

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const counts = { orders: 0, promocodes: 0, settings: false };

    if (Array.isArray(body.orders)) {
      for (const o of body.orders) {
        await saveOrder({
          stripeSessionId: o.stripeSessionId,
          customerEmail: o.customerEmail,
          customerName: o.customerName,
          quantity: o.quantity,
          total: o.total,
          shippingAddress: o.shippingAddress || '',
          city: o.city || '',
          postalCode: o.postalCode || '',
          country: o.country || '',
          carrier: o.carrier || undefined,
          trackingNumber: o.trackingNumber || undefined,
          status: o.status || 'confirmed',
          createdAt: o.createdAt || new Date().toISOString(),
        });
        counts.orders++;
      }
    }

    if (Array.isArray(body.promocodes)) {
      for (const p of body.promocodes) {
        await saveCode({
          code: p.code,
          discountType: p.discountType,
          discountValue: p.discountValue,
          minQuantity: p.minQuantity || 1,
          maxUses: p.maxUses || 0,
          usedCount: p.usedCount || 0,
          expiresAt: p.expiresAt || undefined,
          active: p.active !== false,
          label: p.label || '',
        });
        counts.promocodes++;
      }
    }

    if (body.settings) {
      await saveSettings({
        unitPriceCents: body.settings.unitPriceCents || 500,
        shippingCents: body.settings.shippingCents || 50,
        maxQuantity: body.settings.maxQuantity || 50,
      });
      counts.settings = true;
    }

    return new Response(JSON.stringify({ success: true, counts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};