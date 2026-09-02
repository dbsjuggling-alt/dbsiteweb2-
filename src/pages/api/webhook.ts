/**
 * Stripe webhook endpoint.
 * Receives checkout.session.completed → creates SendCloud shipment automatically.
 *
 * Stripe CLI for local testing:
 *   stripe listen --forward-to localhost:4321/api/webhook
 */

import type { APIRoute } from 'astro';
import 'dotenv/config';
import Stripe from 'stripe';
import { sendOrderConfirmation, sendShippingNotification } from '../../lib/email';
import { saveOrder } from '../../lib/orders';
import { createShipment } from '../../lib/sendcloud';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const DEFAULT_CARRIER = 'Mondial Relay';

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!sig || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Missing signature or webhook secret' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only handle checkout.session.completed
  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true, event: event.type }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  console.log('[webhook] Checkout completed:', session.id);

  try {
    // Retrieve the full session with line items
    // Note: shipping_details is NOT expandable (it's already in the event data)
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items'],
    });

    // Shipping details: try new API format (collected_information) first, then classic
    const collectedShipping = (session as any).collected_information?.shipping_details;
    const shipping = collectedShipping || session.shipping_details;
    const customerEmail = fullSession.customer_details?.email || 'unknown';
    const customerName = shipping?.name || fullSession.customer_details?.name || 'Client';
    const customerPhone = fullSession.customer_details?.phone || shipping?.phone || '';

    if (!shipping?.address) {
      console.error('[webhook] No shipping address for session', session.id);
      return new Response(JSON.stringify({ error: 'No shipping address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lineItems = fullSession.line_items?.data || [];
    const quantity = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const addr = shipping.address;

    // ---------- 1. Send order confirmation email ----------
    const shippingAddressStr = [addr.line1, addr.line2].filter(Boolean).join(', ');
    await sendOrderConfirmation({
      customerEmail,
      customerName,
      quantity,
      total: (session.amount_total || 500) / 100,
      shippingAddress: shippingAddressStr,
      city: addr.city || '',
      postalCode: addr.postal_code || '',
      country: addr.country || '',
      orderId: session.id,
    });
    console.log('[webhook] Confirmation email sent');

    // ---------- 2. Split name ----------
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.slice(1).join(' ') || customerName;

    // ---------- 3. Create SendCloud shipment ----------
    const sendcloudResult = await createShipment(
      {
        name: customerName,
        address_line_1: addr.line1 || '',
        house_number: (addr.line1?.split(' ')[0]) || '1',
        postal_code: addr.postal_code || '',
        city: addr.city || '',
        country_code: addr.country || 'FR',
        email: customerEmail,
        phone_number: customerPhone || undefined,
      },
      DEFAULT_CARRIER,
      [
        {
          weight: { value: Math.max(0.1, quantity * 0.07).toFixed(3), unit: 'kg' },
          dimensions: { length: '28', width: '20', height: '10', unit: 'cm' },
          description: `Balles de jonglage × ${quantity}`,
        },
      ],
      session.id.substring(0, 50),
    );

    const shipmentData = sendcloudResult.data;
    const trackingNumber = shipmentData.parcels?.[0]?.tracking_number || '';
    const trackingUrl = shipmentData.parcels?.[0]?.tracking_url || undefined;
    const carrierName = shipmentData.carrier?.name || DEFAULT_CARRIER;

    console.log(`[webhook] SendCloud shipment created: ${shipmentData.id}, tracking: ${trackingNumber || 'pending'}`);

    // ---------- 4. Send shipping notification email ----------
    if (trackingNumber) {
      await sendShippingNotification({
        customerEmail,
        customerName,
        trackingNumber,
        carrier: carrierName,
        trackingUrl,
        quantity,
        orderId: session.id,
      });
      console.log('[webhook] Shipping notification sent with tracking:', trackingNumber);
    } else {
      console.log('[webhook] No tracking number yet — email will be sent via SendCloud webhook callback');
    }

    // ---------- 5. Save order ----------
    await saveOrder({
      stripeSessionId: session.id,
      customerEmail,
      customerName,
      quantity,
      total: (session.amount_total || 500) / 100,
      shippingAddress: shippingAddressStr,
      city: addr.city || '',
      postalCode: addr.postal_code || '',
      country: addr.country || '',
      carrier: carrierName,
      trackingNumber: trackingNumber || undefined,
      status: trackingNumber ? 'shipped' : 'confirmed',
      createdAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      received: true,
      sendcloudId: shipmentData.id,
      trackingNumber: trackingNumber || null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[webhook] Error processing checkout:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};