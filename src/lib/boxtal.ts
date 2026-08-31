/**
 * Boxtal API v3 service — raw fetch, no SDK dependency.
 *
 * Auth: Basic auth (accessKey:secretKey) or Bearer token via POST /iam/account-app/token.
 * Docs: https://developer.boxtal.com/fr/fr/apiv3
 */

const BASE_URL = process.env.BOXTAL_SANDBOX === 'true'
  ? 'https://api.boxtal.build'
  : 'https://api.boxtal.com';

interface BoxtalAddress {
  civility?: 'M' | 'MRS';
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone: string;
  location: {
    number: string;
    street: string;
    city: string;
    postalCode: string;
    countryIso: string;
  };
}

interface ShippingOrderRequest {
  labelType: 'PDF_A4' | 'PDF_10X15';
  shippingOfferCode: string;
  shipment: {
    externalId: string;
    packages: Array<{
      packageType: 'PARCEL';
      weight: number; // kg
      dimensions?: { width: number; height: number; length: number }; // cm
    }>;
    sender: BoxtalAddress;
    recipient?: BoxtalAddress;
    contentDescription: string;
    totalValue?: { value: number; currency: 'EUR' };
    deliveryInstructions?: string;
  };
}

interface ShippingOrderResponse {
  id: string;
  status: string;
  trackingNumber?: string;
  deliveryPriceExclTax?: { value: number; currency: string };
  documents?: Array<{ type: string; format: string; url: string }>;
}

function basicAuth(): string {
  const accessKey = process.env.BOXTAL_ACCESS_KEY || '';
  const secretKey = process.env.BOXTAL_SECRET_KEY || '';
  return Buffer.from(`${accessKey}:${secretKey}`).toString('base64');
}

async function boxtalFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth()}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Boxtal API ${res.status}: ${body}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Create a shipping order. Boxtal processes it and sends a webhook callback
 * when the label is ready.
 */
export async function createShippingOrder(
  request: ShippingOrderRequest,
): Promise<ShippingOrderResponse> {
  return boxtalFetch<ShippingOrderResponse>(
    '/shipping/v3.1/shipping-order',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

/**
 * Fetch documents (labels) for a shipping order.
 */
export async function getShippingDocuments(
  orderId: string,
): Promise<Array<{ type: string; format: string; url: string }>> {
  const data = await boxtalFetch<Array<{ type: string; format: string; url: string }>>(
    `/shipping/v3.1/shipping-order/${orderId}/documents`,
  );
  return data;
}

/**
 * Download a document and save it to disk.
 */
export async function downloadLabel(
  url: string,
  outputPath: string,
): Promise<string> {
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${basicAuth()}` },
  });
  if (!res.ok) throw new Error(`Failed to download label: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const fs = await import('node:fs/promises');
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}