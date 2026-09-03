/**
 * TEMPORARY diagnostic endpoint — check DB connectivity and env.
 * GET /api/debug-db?token=XXX
 * DELETE AFTER USE.
 */
import type { APIRoute } from 'astro';
import 'dotenv/config';
import { getDb } from '../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const hasDbUrl = !!(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);
  const dbUrlPrefix = (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '').split('@')[0];

  try {
    const pool = await getDb();
    const res = await pool.query('SELECT 1 AS ok');
    return new Response(JSON.stringify({
      hasDbUrl,
      dbUrlPrefix,
      connection: 'ok',
      select1: res.rows[0],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({
      hasDbUrl,
      dbUrlPrefix,
      connection: 'error',
      name: err?.name,
      message: err?.message,
      code: err?.code,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};