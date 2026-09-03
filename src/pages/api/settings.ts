/**
 * Public API — read-only store settings for frontend display.
 * GET /api/settings
 */
import type { APIRoute } from 'astro';
import { getSettings } from '../../lib/settings';

export const GET: APIRoute = async () => {
  try {
    const settings = await getSettings();
    return new Response(JSON.stringify({ settings }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};