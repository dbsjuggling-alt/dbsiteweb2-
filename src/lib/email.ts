/**
 * Email service — powered by Resend.
 * Sends order confirmation and (later) shipping notifications.
 *
 * Setup: add RESEND_API_KEY to your .env (get one at https://resend.com)
 * Sender email must be verified in Resend (domain or single address).
 */
import { Resend } from 'resend';

// Lazy init — avoids throwing at module import time if env isn't loaded yet
function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY || '');
}

const SENDER = process.env.SENDER_EMAIL || 'dbsjuggling@gmail.com';
const SENDER_NAME = process.env.SENDER_COMPANY || "db's Juggling";
// Resend requires a verified sender. Default onboarding@resend.dev works for testing.
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// ---------------------------------------------------------------------------
// Order confirmation — sent right after successful payment
// ---------------------------------------------------------------------------

export interface OrderConfirmationData {
  customerEmail: string;
  customerName: string;
  quantity: number;
  total: number;            // euros
  shippingAddress: string;
  city: string;
  postalCode: string;
  country: string;
  orderId: string;          // Stripe session id
}

export async function sendOrderConfirmation(data: OrderConfirmationData) {
  const {
    customerEmail,
    customerName,
    quantity,
    total,
    shippingAddress,
    city,
    postalCode,
    country,
    orderId,
  } = data;

  const html = buildConfirmationHtml({
    customerName,
    quantity,
    total,
    shippingAddress,
    city,
    postalCode,
    country,
    orderId,
  });

  const { error } = await getResend().emails.send({
    from: `${SENDER_NAME} <${FROM_EMAIL}>`,
    to: [customerEmail],
    subject: `✅ Commande confirmée — ${quantity} balle${quantity > 1 ? 's' : ''} db's Juggling`,
    html,
  });

  if (error) {
    console.error('[email] Failed to send confirmation:', error);
    // Don't throw — the webhook should still return 200 to Stripe
  } else {
    console.log('[email] Confirmation sent to', customerEmail);
  }
}

// ---------------------------------------------------------------------------
// Shipping notification — sent manually with tracking number (phase 2)
// ---------------------------------------------------------------------------

export interface ShippingNotificationData {
  customerEmail: string;
  customerName: string;
  trackingNumber: string;
  carrier?: string;           // e.g. 'Colissimo', 'Mondial Relay'
  trackingUrl?: string;       // optional direct link
  quantity: number;
  orderId?: string;            // Stripe session id (optional, for reference)
}

export async function sendShippingNotification(data: ShippingNotificationData) {
  const {
    customerEmail,
    customerName,
    trackingNumber,
    carrier,
    trackingUrl,
    quantity,
    orderId,
  } = data;

  const html = buildShippingHtml({
    customerName,
    trackingNumber,
    carrier,
    trackingUrl,
    quantity,
    orderId,
  });

  const { error } = await getResend().emails.send({
    from: `${SENDER_NAME} <${FROM_EMAIL}>`,
    to: [customerEmail],
    subject: `📦 Ta commande ${quantity > 0 ? `(${quantity} balle${quantity > 1 ? 's' : ''}) ` : ''}a été expédiée !`,
    html,
  });

  if (error) {
    console.error('[email] Failed to send shipping notification:', error);
  } else {
    console.log('[email] Shipping notification sent to', customerEmail);
  }
}

// ---------------------------------------------------------------------------
// HTML template — shipping notification
// ---------------------------------------------------------------------------

function buildShippingHtml(opts: {
  customerName: string;
  trackingNumber: string;
  carrier?: string;
  trackingUrl?: string;
  quantity: number;
  orderId?: string;
}) {
  const { customerName, trackingNumber, carrier, trackingUrl, quantity, orderId } = opts;
  const carrierName = carrier || 'Colissimo';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">

        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background:#673de6;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                📦 Colis en route&nbsp;!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px;color:#1a1a1a;">

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Salut <strong style="color:#673de6;">${customerName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">
                ${quantity > 0 ? `Ta commande de ${quantity} balle${quantity > 1 ? 's' : ''} ` : 'Ta commande '}vient d&rsquo;être expédiée&nbsp;! 🎉
              </p>

              <!-- Tracking card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      🔍 Numéro de suivi
                    </p>
                    <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#673de6;letter-spacing:1px;">
                      ${trackingNumber}
                    </p>
                    <p style="margin:0;font-size:13px;color:#888;">
                      Transporteur&nbsp;: ${carrierName}
                    </p>
                    ${trackingUrl ? `
                    <p style="margin:18px 0 0;">
                      <a href="${trackingUrl}" target="_blank" style="display:inline-block;background:#673de6;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
                        Suivre mon colis →
                      </a>
                    </p>` : `
                    <p style="margin:12px 0 0;font-size:12px;color:#999;">
                      Colle ce numéro sur le site de ${carrierName} pour suivre ton colis.
                    </p>`}
                  </td>
                </tr>
              </table>

              ${orderId ? `<p style="margin:0 0 4px;font-size:12px;color:#bbb;">
                Réf. commande&nbsp;: <code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:11px;">${orderId}</code>
              </p>` : ''}
              <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
                Merci de ta confiance et bonne pratique&nbsp;!<br />
                Si tu as la moindre question, réponds simplement à cet email.
              </p>

            </td>
          </tr>

          <tr>
            <td style="background:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                db's Juggling &mdash; <a href="https://dbs97531juggling.com" style="color:#673de6;text-decoration:none;">dbs97531juggling.com</a>
              </p>
            </td>
          </tr>

        </table>

        <p style="margin-top:16px;font-size:11px;color:#bbb;">
          Cet email a été envoyé automatiquement suite à l&rsquo;expédition de ta commande.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function buildConfirmationHtml(opts: {
  customerName: string;
  quantity: number;
  total: number;
  shippingAddress: string;
  city: string;
  postalCode: string;
  country: string;
  orderId: string;
}) {
  const { customerName, quantity, total, shippingAddress, city, postalCode, country, orderId } = opts;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#673de6;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                🎯 Merci pour ta commande&nbsp;!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;color:#1a1a1a;">

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Salut <strong style="color:#673de6;">${customerName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">
                On a bien reçu ta commande&nbsp;! Voici un petit récapitulatif&nbsp;:
              </p>

              <!-- Récap -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:#888;">Produit</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;text-align:right;">
                          Balle de jonglage 70mm × ${quantity}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:#888;">Total payé</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;text-align:right;">
                          ${total.toFixed(2)} €
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:#888;">Livraison</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;text-align:right;">
                          0,50 € (suivi)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Adresse -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
                      📦 Adresse de livraison
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;">
                      ${shippingAddress}<br />
                      ${postalCode} ${city}<br />
                      ${country}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#999;line-height:1.5;">
                Réf. commande&nbsp;: <code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:12px;">${orderId}</code>
              </p>
              <p style="margin:0 0 4px;font-size:13px;color:#999;line-height:1.5;">
                Tu recevras un deuxième email dès que ton colis sera expédié avec le numéro de suivi.
              </p>
              <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
                Si tu as la moindre question, réponds simplement à cet email&nbsp;!
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                db's Juggling &mdash; <a href="https://dbs97531juggling.com" style="color:#673de6;text-decoration:none;">dbs97531juggling.com</a>
              </p>
            </td>
          </tr>

        </table>

        <p style="margin-top:16px;font-size:11px;color:#bbb;">
          Cet email a été envoyé automatiquement suite à ton achat sur dbs97531juggling.com.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;
}