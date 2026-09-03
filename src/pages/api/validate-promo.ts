/**
 * Promo code validation API — just validates, doesn't create a Stripe session.
 * Built-in fallbacks for TEST99 and WELCOME10 if the module has issues.
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { validateCode, applyDiscount } from '../../lib/promocodes';
import { getSettings } from '../../lib/settings';

// These are hardcoded fallbacks if Railway doesn't have the latest code
const FALLBACK_CODES: Record<string, { discountType: 'percentage' | 'fixed'; discountValue: number; label: string; maxUses: number }> = {
  'TEST99': { discountType: 'percentage', discountValue: 99, label: '-99%', maxUses: 999 },
  'WELCOME10': { discountType: 'percentage', discountValue: 10, label: '-10%', maxUses: 50 },
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const settings = await getSettings();
    const { promoCode, quantity } = await request.json();

    if (!promoCode || !promoCode.trim()) {
      return new Response(JSON.stringify({ valid: false, reason: 'Code requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const maxQty = settings.maxQuantity;
    const qty = Math.max(1, Math.min(maxQty, parseInt(quantity, 10) || 1));
    const baseUnit = settings.unitPriceCents;
    const code = promoCode.toUpperCase().trim();

    // Try the module first
    const result = await validateCode(code, qty);

    if (result.valid && result.promo) {
      const totalCents = baseUnit * qty;
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
    }

    // Fallback: check hardcoded codes
    const fallback = FALLBACK_CODES[code];
    if (fallback) {
      // Compute as if usedCount = 0
      const promo = { code, ...fallback, minQuantity: 1, usedCount: 0, active: true, expiresAt: undefined };
      const totalCents = baseUnit * qty;

      let saved = 0;
      if (fallback.discountType === 'percentage') {
        saved = Math.round(totalCents * fallback.discountValue / 100);
      } else {
        saved = Math.min(totalCents, fallback.discountValue);
      }

      return new Response(JSON.stringify({
        valid: true,
        label: fallback.label,
        discountType: fallback.discountType,
        discountValue: fallback.discountValue,
        code,
        originalCents: totalCents,
        discountedCents: totalCents - saved,
        savedCents: saved,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      valid: false,
      reason: result.reason || 'Code inexistant',
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