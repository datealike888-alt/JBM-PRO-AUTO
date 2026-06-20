import { isAuthorizedAdminRequest } from '../../../../lib/adminAuth';
import { query } from '../../../../lib/db';
import { POST as saveVehiclePost, DELETE } from '../route';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export { DELETE };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

async function getRouteId(context) {
  const params = await context?.params;
  return String(params?.id || '').trim();
}

export async function GET(request, context) {
  try {
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = await getRouteId(context);
    if (!id) return json({ error: 'Missing id' }, { status: 400 });
    const rows = await query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
    return json({ success: true, vehicle: rows[0] || null }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[vehicles/[id]] GET failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  return saveVehiclePost(request);
}

async function saveVehicleWithRouteId(request, context) {
  if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = await getRouteId(context);
  if (!id) return json({ error: 'Missing id' }, { status: 400 });
  const rows = await query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]).catch(() => []);
  const existing = Array.isArray(rows) && rows.length ? rows[0] : {};
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  return saveVehiclePost(new Request(request.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...existing, ...body, id }),
  }));
}

export async function PUT(request, context) {
  return saveVehicleWithRouteId(request, context);
}

export async function PATCH(request, context) {
  return saveVehicleWithRouteId(request, context);
}
