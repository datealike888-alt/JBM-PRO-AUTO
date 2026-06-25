import {
  buildYearMonthDayFilters,
  cleanString,
  ensureLeaveLogsTable,
  isAuthorizedToken,
  normalizeLeaveLogInput,
  normalizeLeaveLogRow,
  query,
} from '../../../lib/employeeStorage';
import { getAuthorizedAdminFromRequest } from '../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import { requirePermission } from '../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function buildWhere(url) {
  const where = [];
  const params = [];
  const employeeId = cleanString(url.searchParams.get('employeeId'), 64);
  const type = cleanString(url.searchParams.get('type'), 100);
  const status = cleanString(url.searchParams.get('status'), 50);
  const submittedFilters = buildYearMonthDayFilters(url, 'created_at');

  if (employeeId) {
    where.push('employee_id = ?');
    params.push(employeeId);
  }
  if (type) {
    where.push('leave_type = ?');
    params.push(type);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  where.push(...submittedFilters.where);
  params.push(...submittedFilters.params);

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function GET(request) {
  try {
    const authResult = await requirePermission(request, 'employees.leave');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    await ensureLeaveLogsTable();

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT el.id, el.employee_id, e.employee_code, el.leave_type, el.start_date, el.end_date, el.total_days, el.approver,
              el.reason, el.status, el.created_at, el.updated_at
       FROM employee_leaves el
       LEFT JOIN employees e ON e.id = el.employee_id
       ${where.clause}
       ORDER BY el.created_at DESC
       LIMIT 5000`,
      where.params
    );

    return json({ success: true, logs: rows.map(normalizeLeaveLogRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[leave-logs] GET failed', error);
    return json({ error: 'Leave service unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requirePermission(request, 'employees.leave');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const log = normalizeLeaveLogInput(body);
    if (!log.employeeId || !log.type || !log.startDate || !log.endDate) {
      return json({ error: 'employeeId, type, startDate and endDate are required' }, { status: 400 });
    }

    await ensureLeaveLogsTable();
    const beforeRows = await query(
      `SELECT el.id, el.employee_id, e.employee_code, el.leave_type, el.start_date, el.end_date, el.total_days, el.approver,
              el.reason, el.status, el.created_at, el.updated_at
       FROM employee_leaves el
       LEFT JOIN employees e ON e.id = el.employee_id
       WHERE el.id = ?
       LIMIT 1`,
      [log.id]
    );
    const previousLog = Array.isArray(beforeRows) && beforeRows.length ? normalizeLeaveLogRow(beforeRows[0]) : null;
    await query(
      `INSERT INTO employee_leaves (
        id, employee_id, leave_type, start_date, end_date, total_days, reason, approver, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        leave_type = VALUES(leave_type),
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        total_days = VALUES(total_days),
        reason = VALUES(reason),
        approver = VALUES(approver),
        status = VALUES(status)`,
      [
        log.id,
        log.employeeId,
        log.type,
        log.startDate,
        log.endDate,
        log.totalDays,
        log.reason,
        log.approver,
        log.status,
        log.createdAt,
      ]
    );

    const rows = await query(
      `SELECT el.id, el.employee_id, e.employee_code, el.leave_type, el.start_date, el.end_date, el.total_days, el.approver,
              el.reason, el.status, el.created_at, el.updated_at
       FROM employee_leaves el
       LEFT JOIN employees e ON e.id = el.employee_id
       WHERE el.id = ?
       LIMIT 1`,
      [log.id]
    );

    const savedLog = normalizeLeaveLogRow(rows[0] || log);
    await insertAuditLogSafe({
      action: previousLog ? 'UPDATE' : 'CREATE',
      module: 'LEAVE',
      entityType: 'EMPLOYEE_LEAVE',
      entityId: savedLog.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: `${savedLog.employeeCode || savedLog.employeeId} ${savedLog.type}`.trim(),
        beforeData: previousLog,
        afterData: savedLog,
      },
    });

    return json({ success: true, log: savedLog }, { status: 200 });
  } catch (error) {
    console.error('[leave-logs] POST failed', error);
    return json({ error: 'Unable to save leave log' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'employees.leave');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await ensureLeaveLogsTable();
    const rows = await query(
      `SELECT el.id, el.employee_id, e.employee_code, el.leave_type, el.start_date, el.end_date, el.total_days, el.approver,
              el.reason, el.status, el.created_at, el.updated_at
       FROM employee_leaves el
       LEFT JOIN employees e ON e.id = el.employee_id
       WHERE el.id = ?
       LIMIT 1`,
      [id]
    );
    const previousLog = Array.isArray(rows) && rows.length ? normalizeLeaveLogRow(rows[0]) : null;
    await query('DELETE FROM employee_leaves WHERE id = ?', [id]);
    if (previousLog) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'LEAVE',
        entityType: 'EMPLOYEE_LEAVE',
        entityId: previousLog.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: `${previousLog.employeeCode || previousLog.employeeId} ${previousLog.type}`.trim(),
          beforeData: previousLog,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[leave-logs] DELETE failed', error);
    return json({ error: 'Unable to delete leave log' }, { status: 503 });
  }
}
