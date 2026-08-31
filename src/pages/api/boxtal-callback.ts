/**
 * Boxtal webhook callback endpoint.
 * Boxtal POSTs here when a shipping order status changes (label ready, etc.).
 */

import type { APIRoute } from 'astro';
import 'dotenv/config';
import { getShippingDocuments, downloadLabel } from '../../lib/boxtal';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  console.log('[boxtal-callback] Event received:', JSON.stringify(body));

  // Boxtal sends events like: { event: "shipping-order.completed", data: { id: "..." } }
  const orderId = body?.data?.id || body?.id;
  const eventType = body?.event || body?.type;

  if (!orderId) {
    return new Response(JSON.stringify({ received: true, note: 'no order id' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[boxtal-callback] Order ${orderId} event: ${eventType}`);

  // Download labels when order is completed
  if (eventType === 'shipping-order.completed' || eventType === 'completed') {
    try {
      const docs = await getShippingDocuments(orderId);
      if (docs.length > 0) {
        const labelsDir = `/home/stouille/dev/dbs-juggling-site/labels`;
        const fs = await import('node:fs/promises');
        await fs.mkdir(labelsDir, { recursive: true });

        for (const doc of docs) {
          const outputPath = `${labelsDir}/${orderId}_${doc.type}_${Date.now()}.${doc.format?.toLowerCase() || 'pdf'}`;
          await downloadLabel(doc.url, outputPath);
          console.log('[boxtal-callback] Label saved:', outputPath);
        }
      }
    } catch (err: any) {
      console.error('[boxtal-callback] Error downloading labels:', err.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};