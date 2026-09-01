/**
 * SendCloud webhook endpoint.
 * Receives shipment status updates from SendCloud.
 * When status changes to "shipped" (id: 1000), automatically sends
 * the shipping notification email to the customer with tracking number.
 *
 * Config in SendCloud dashboard:
 *   Settings → Webhooks → Add webhook
 *   URL: https://dbs97531juggling.com/api/webhook/sendcloud
 *   Events: shipment_status_change
 *
 * Pass `order_number = Stripe session ID` when creating shipments via
 * SendCloud API to enable the lookup back to customer info.
 */

import type { APIRoute } from 'astro';
import 'dotenv/config';
import { findOrder, markShipped } from '../../../lib/orders';
import { sendShippingNotification } from '../../../lib/email';

interface SendCloudPayload {
  event: string;
  shipment?: {
    id: number;
    status?: { id: number; message: string };
    tracking_number?: string;
    carrier?: { name: string; code: string };
    order_number?: string;
    external_order_id?: string;
  };
}

export const POST: APIRoute = async ({ request }) => {
  let body: SendCloudPayload;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('[sendcloud-webhook] Event received:', JSON.stringify(body));

  const shipment = body.shipment;
  if (!shipment || !shipment.order_number) {
    console.log('[sendcloud-webhook] No shipment or order_number — ignoring');
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = shipment.order_number;
  const statusId = shipment.status?.id;
  const trackingNumber = shipment.tracking_number || '';
  const carrierName = shipment.carrier?.name || 'Mondial Relay';

  // Only act on "shipped" status (id: 1000)
  if (statusId !== 1000) {
    console.log(`[sendcloud-webhook] Status ${statusId} (${shipment.status?.message}) — no action needed`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!trackingNumber) {
    console.log('[sendcloud-webhook] Shipped but no tracking number yet — skipping');
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up the order
  const order = await findOrder(sessionId);
  if (!order) {
    console.log(`[sendcloud-webhook] No order found for session ${sessionId} — can't send email`);
    // Still return 200 — SendCloud expects success
    return new Response(JSON.stringify({ received: true, warning: 'order not found' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send the email
  console.log(`[sendcloud-webhook] Sending shipping notification to ${order.customerEmail}`);

  try {
    await sendShippingNotification({
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      trackingNumber,
      carrier: carrierName,
      quantity: order.quantity,
      orderId: sessionId,
    });

    // Mark as shipped in our records
    await markShipped(sessionId, trackingNumber, carrierName);

    console.log('[sendcloud-webhook] ✅ Email sent and order updated');
  } catch (err: any) {
    console.error('[sendcloud-webhook] Failed to send email:', err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};