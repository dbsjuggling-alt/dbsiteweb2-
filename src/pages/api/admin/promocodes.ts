/**
 * Admin API for promo codes management.
 * Protected by ADMIN_TOKEN (same token as /admin).
 *
 * GET  /api/admin/promocodes?token=XXX  → list all codes
 * POST /api/admin/promocodes?token=XXX  → create or update a code
 * DELETE /api/admin/promocodes?token=XXX&code=XXXX → deactivate a code
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { listCodes, saveCode } from '../../../lib/promocodes';
import type { PromoCode } from '../../../lib/promocodes';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const codes = await listCodes();
    return new Response(JSON.stringify({ codes }), {
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

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { code, discountType, discountValue, label, minQuantity, maxUses, expiresAt, active } = body;

    if (!code || !code.trim()) {
      return new Response(JSON.stringify({ error: 'Le code est requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return new Response(JSON.stringify({ error: 'Type de réduction invalide (percentage ou fixed)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const promo: PromoCode = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseInt(discountValue, 10) || 0,
      label: label || `${discountType === 'percentage' ? '-' : ''}${discountValue}${discountType === 'percentage' ? '%' : '€'}`,
      minQuantity: parseInt(minQuantity, 10) || 1,
      maxUses: parseInt(maxUses, 10) || 0,
      usedCount: 0,
      expiresAt: expiresAt || undefined,
      active: active !== false,
    };

    // If updating an existing code, preserve usedCount
    const existing = await listCodes();
    const found = existing.find(c => c.code === promo.code);
    if (found) {
      promo.usedCount = found.usedCount;
    }

    await saveCode(promo);
    return new Response(JSON.stringify({ success: true, promo }), {
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

export const DELETE: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const code = url.searchParams.get('code');

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!code) {
    return new Response(JSON.stringify({ error: 'Code requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const codes = await listCodes();
    const found = codes.find(c => c.code === code.trim().toUpperCase());
    if (!found) {
      return new Response(JSON.stringify({ error: 'Code introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Deactivate instead of deleting (seed codes cannot be removed)
    found.active = false;
    await saveCode(found);

    return new Response(JSON.stringify({ success: true, code: found.code, active: false }), {
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