import { query } from './db';

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanNullable(value, maxLength = 5000) {
  const text = cleanString(value, maxLength);
  return text || null;
}

export async function ensureAuditLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      module VARCHAR(100) NULL,
      entity_type VARCHAR(100) NULL,
      entity_id VARCHAR(64) NULL,
      detail TEXT NULL,
      created_by VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_logs_created_at (created_at),
      INDEX idx_audit_logs_module (module),
      INDEX idx_audit_logs_entity_id (entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export function normalizeAuditLogInput(body = {}) {
  const detail = body?.detail && typeof body.detail === 'object'
    ? JSON.stringify(body.detail)
    : cleanNullable(body?.detail, 20000);

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
  await ensureAuditLogsTable();
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
