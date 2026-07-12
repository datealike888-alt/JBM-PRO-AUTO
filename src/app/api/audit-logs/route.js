import { insertAuditLog } from '../../../lib/auditLog';
import { getAuthorizedAdminFromRequest, isAuthorizedAdminRequest } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { assertSchemaReady, handleSchemaError } from '../../../lib/schemaReadiness';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request) {
  try {
    await assertSchemaReady('audit');
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const rows = await query(
      `SELECT id, action, module, entity_type, entity_id, detail, created_by, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 1000`
    ).catch(() => []);
    return json({ success: true, logs: rows }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[audit-logs] GET failed', error);
    return json({ error: 'Audit logs unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const log = await insertAuditLog({
      ...body,
      createdBy: body?.createdBy || admin.displayName || admin.username,
    });
    return json({ success: true, log }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[audit-logs] POST failed', error);
    return json({ error: 'Unable to save audit log' }, { status: 503 });
  }
}
