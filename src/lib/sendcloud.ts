/**
 * SendCloud API v3 — create shipments (Colissimo, Mondial Relay, etc.)
 *
 * Docs: https://sendcloud.dev/api/v3
 * Auth: OAuth2 (client_credentials) — Basic auth to get token, then Bearer token.
 *
 * Token expires in 1 hour; cached in-memory and auto-refreshed.
 */

const BASE_URL = 'https://panel.sendcloud.sc/api/v3';
const TOKEN_URL = 'https://account.sendcloud.com/oauth2/token';

// In-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

function getCreds(): { publicKey: string; privateKey: string } {
  return {
    publicKey: process.env.SENDCLOUD_PUBLIC_KEY || '',
    privateKey: process.env.SENDCLOUD_PRIVATE_KEY || '',
  };
}

function basicAuth(): string {
  const { publicKey, privateKey } = getCreds();
  return Buffer.from(`${publicKey}:${privateKey}`).toString('base64');
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth()}`,
    },
    body: 'grant_type=client_credentials&scope=api',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendCloud OAuth2 ${res.status}: ${body}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const body = await res.text();

  if (!res.ok) {
    throw new Error(`SendCloud API ${res.status}: ${body}`);
  }

  return JSON.parse(body);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Address {
  name: string;
  company_name?: string;
  address_line_1: string;
  house_number: string;
  postal_code: string;
  city: string;
  country_code: string;
  email?: string;
  phone_number?: string;
}

export interface Parcel {
  weight: { value: string; unit: 'kg' };
  dimensions?: { length: string; width: string; height: string; unit: 'cm' };
  description?: string;
}

export interface ShipmentResponse {
  data: {
    id: string;
    order_number: string | null;
    carrier: { code: string; name: string };
    parcels: Array<{
      tracking_number: string;
      tracking_url: string | null;
      status: { code: string; message: string };
    }>;
    to_address: Address;
  };
  errors?: any[];
}

// ---------------------------------------------------------------------------
// Carrier shipping option codes for this account
// ---------------------------------------------------------------------------

interface CarrierConfig {
  code: string;
  contractId: number;
}

const CARRIER_MAP: Record<string, CarrierConfig> = {
  'Mondial Relay': {
    code: 'mondial_relay:home_domestic,dualapi/c2c',
    contractId: 239536,
  },
  'Colissimo': {
    code: 'colissimo:home/fr',
    contractId: 1337,
  },
};

// ---------------------------------------------------------------------------
// Create and announce a shipment
// ---------------------------------------------------------------------------

export async function createShipment(
  toAddress: Address,
  carrierName: string,
  parcels: Parcel[],
  orderNumber?: string,
): Promise<ShipmentResponse> {
  const carrierConfig = CARRIER_MAP[carrierName];
  if (!carrierConfig) {
    throw new Error(`Unsupported carrier: ${carrierName}. Supported: ${Object.keys(CARRIER_MAP).join(', ')}`);
  }

  const fromAddress: Address = {
    name: `${process.env.SENDER_FIRST_NAME || ''} ${process.env.SENDER_LAST_NAME || ''}`.trim() || "db's Juggling",
    company_name: process.env.SENDER_COMPANY || "db's Juggling",
    address_line_1: `${process.env.SENDER_NUMBER || ''} ${process.env.SENDER_STREET || ''}`.trim() || 'Adresse',
    house_number: process.env.SENDER_NUMBER || '1',
    postal_code: process.env.SENDER_POSTAL_CODE || '33420',
    city: process.env.SENDER_CITY || 'Saint-Jean-de-Blaignac',
    country_code: process.env.SENDER_COUNTRY || 'FR',
    email: process.env.SENDER_EMAIL || 'dbsjuggling@gmail.com',
    phone_number: process.env.SENDER_PHONE || '',
  };

  const request = {
    to_address: toAddress,
    from_address: fromAddress,
    ship_with: {
      type: 'shipping_option_code',
      properties: {
        shipping_option_code: carrierConfig.code,
        contract_id: carrierConfig.contractId,
      },
    },
    order_number: orderNumber,
    parcels,
  };

  return apiFetch<ShipmentResponse>('/shipments', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ---------------------------------------------------------------------------
// Fetch available shipping options
// ---------------------------------------------------------------------------

export interface ShippingOption {
  code: string;
  name: string;
  carrier: { code: string; name: string };
  contract: { id: number; name: string };
  functionalities: { last_mile: string };
}

export async function fetchShippingOptions(
  toCountry: string,
  fromCountry: string = 'FR',
  carrierCode?: string,
): Promise<ShippingOption[]> {
  const body: any = {
    from_country_code: fromCountry,
    to_country_code: toCountry,
    weight: { value: '0.5', unit: 'kg' },
  };
  if (carrierCode) body.carrier_code = carrierCode;

  const data = await apiFetch<{ data: ShippingOption[] }>('/fetch-shipping-options', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.data;
}