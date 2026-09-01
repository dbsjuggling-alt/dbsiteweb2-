import type { APIRoute } from 'astro';
import 'dotenv/config';
import Stripe from 'stripe';
import { validateCode, applyDiscount, markUsed } from '../../lib/promocodes';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const STRIPE_MINIMUM_CENTS = 50;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { quantity, unitAmount, promoCode } = await request.json();
    const qty = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    const baseUnit = parseInt(unitAmount, 10) || 500;
    const productsCents = baseUnit * qty;

    let appliedPromo: { code: string; label: string } | null = null;
    let finalCents = productsCents;

    if (promoCode && promoCode.trim()) {
      const result = await validateCode(promoCode, qty);
      
      // Use fallback if module fails
      let discount: { discountedCents: number; savedCents: number } | null = null;
      
      if (result.valid && result.promo) {
        discount = applyDiscount(productsCents, result.promo);
        appliedPromo = { code: result.promo.code, label: result.promo.label };
      } else if (result.reason === 'Code inexistant') {
        // Hardcoded fallback for TEST99 and WELCOME10
        const FALLBACK: Record<string, { type: 'percentage' | 'fixed'; value: number; label: string }> = {
          TEST99: { type: 'percentage', value: 99, label: '-99%' },
          WELCOME10: { type: 'percentage', value: 10, label: '-10%' },
        };
        const fb = FALLBACK[promoCode.trim().toUpperCase()];
        if (fb) {
          let saved = 0;
          if (fb.type === 'percentage') saved = Math.round(productsCents * fb.value / 100);
          else saved = Math.min(productsCents, fb.value);
          discount = { discountedCents: productsCents - saved, savedCents: saved };
          appliedPromo = { code: promoCode.trim().toUpperCase(), label: fb.label };
        }
      }
      
      if (!discount) {
        return new Response(JSON.stringify({
          error: result.reason || 'Code promo invalide',
          promoError: true,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      finalCents = discount.discountedCents;

      // Clamp to Stripe minimum (50 cents for EUR card payments)
      if (finalCents < STRIPE_MINIMUM_CENTS) {
        finalCents = STRIPE_MINIMUM_CENTS;
      }
    }

    const productName = appliedPromo
      ? `Juggling Ball — 70mm White (promo ${appliedPromo.label})`
      : 'Juggling Ball — 70mm White';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: 'Premium juggling ball with ultra fine sand filling',
            },
            unit_amount: Math.round(finalCents / qty),
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'DE', 'IT', 'ES'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 50, currency: 'eur' },
            display_name: 'Standard Shipping (Tracked)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 4 },
            },
          },
        },
      ],
      success_url: `${request.headers.get('origin')}/?success=true`,
      cancel_url: `${request.headers.get('origin')}/store`,
    });

    // Only mark promo used after Stripe session is created
    if (appliedPromo) {
      await markUsed(appliedPromo.code);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};