/**
 * Promo code validation API — just validates, doesn't create a Stripe session.
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { validateCode, applyDiscount } from '../../lib/promocodes';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { promoCode, quantity } = await request.json();
    
    if (!promoCode || !promoCode.trim()) {
      return new Response(JSON.stringify({ valid: false, reason: 'Code requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const qty = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    const result = await validateCode(promoCode, qty);

    if (!result.valid || !result.promo) {
      return new Response(JSON.stringify({
        valid: false,
        reason: result.reason || 'Code invalide',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalCents = 500 * qty;
    const discount = applyDiscount(totalCents, result.promo);

    return new Response(JSON.stringify({
      valid: true,
      label: result.promo.label,
      discountType: result.promo.discountType,
      discountValue: result.promo.discountValue,
      code: result.promo.code,
      originalCents: totalCents,
      discountedCents: discount.discountedCents,
      savedCents: discount.savedCents,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ valid: false, reason: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};