import { query } from './db';
import { assertSchemaReady } from './schemaReadiness';

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanNullable(value, maxLength = 5000) {
  const text = cleanString(value, maxLength);
  return text || null;
}

function truncateUtf8(value, maxBytes = 60000) {
  const text = String(value || '');
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(text.slice(0, mid), 'utf8') <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return text.slice(0, low);
}

export function normalizeAuditLogInput(body = {}) {
  const rawDetail = body?.detail && typeof body.detail === 'object'
    ? JSON.stringify(body.detail)
    : cleanNullable(body?.detail, 20000);
  const detail = rawDetail ? truncateUtf8(rawDetail) : null;

  return {
    id: cleanString(body.id, 64) || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: cleanString(body.action, 100).toUpperCase() || 'UPDATE',
    module: cleanNullable(body.module, 100),
    entityType: cleanNullable(body.entityType || body.entity_type, 100),
    entityId: cleanNullable(body.entityId || body.entity_id, 64),
    detail,
    createdBy: cleanNullable(body.createdBy || body.created_by, 100),
  };
}

export async function insertAuditLog(input = {}) {
  await assertSchemaReady('audit');
  const auditLog = normalizeAuditLogInput(input);
  await query(
    `INSERT INTO audit_logs (id, action, module, entity_type, entity_id, detail, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      auditLog.id,
      auditLog.action,
      auditLog.module,
      auditLog.entityType,
      auditLog.entityId,
      auditLog.detail,
      auditLog.createdBy,
    ]
  );
  return auditLog;
}

export async function insertAuditLogSafe(input = {}) {
  try {
    return await insertAuditLog(input);
  } catch (error) {
    console.error('[audit-log] insert failed', error);
    return null;
  }
}
