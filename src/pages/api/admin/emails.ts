/**
 * Admin API — email log + resend.
 * GET  /api/admin/emails?token=XXX             → list log
 * POST /api/admin/emails/resend?token=XXX      → resend shipping or confirmation for an order
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { listEmailLog, sendShippingNotification, sendOrderConfirmation } from '../../../lib/email';
import { findOrder } from '../../../lib/orders';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const log = await listEmailLog();
    return new Response(JSON.stringify({ emails: log.reverse() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    const orderId = body.orderId;
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId requis' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const order = await findOrder(orderId);
    if (!order) {
      return new Response(JSON.stringify({ error: 'Commande introuvable' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // If order has tracking → resend shipping notification. Otherwise → confirmation.
    if (order.trackingNumber) {
      await sendShippingNotification({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        quantity: order.quantity,
        orderId: order.stripeSessionId,
      });
    } else {
      await sendOrderConfirmation({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        quantity: order.quantity,
        total: order.total,
        shippingAddress: order.shippingAddress,
        city: order.city,
        postalCode: order.postalCode,
        country: order.country,
        orderId: order.stripeSessionId,
      });
    }

    return new Response(JSON.stringify({ success: true, type: order.trackingNumber ? 'shipping' : 'confirmation' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};