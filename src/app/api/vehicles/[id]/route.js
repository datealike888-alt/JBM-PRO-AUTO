import { isAuthorizedAdminRequest } from '../../../../lib/adminAuth';
import { query } from '../../../../lib/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export { POST, DELETE } from '../route';

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request, context) {
  try {
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = String(context?.params?.id || '').trim();
    if (!id) return json({ error: 'Missing id' }, { status: 400 });
    const rows = await query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
    return json({ success: true, vehicle: rows[0] || null }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[vehicles/[id]] GET failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

