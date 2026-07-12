import {
  buildYearMonthDayFilters,
  cleanString,
  isAuthorizedToken,
  normalizeAttendanceLogInput,
  normalizeAttendanceLogRow,
  query,
} from '../../../lib/employeeStorage';
import { assertSchemaReady, handleSchemaError } from '../../../lib/schemaReadiness';
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
  const status = cleanString(url.searchParams.get('status'), 100);
  const dateFilters = buildYearMonthDayFilters(url, 'work_date');

  if (employeeId) {
    where.push('employee_id = ?');
    params.push(employeeId);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  where.push(...dateFilters.where);
  params.push(...dateFilters.params);

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function GET(request) {
  try {
    const authResult = await requirePermission(request, 'employees.attendance');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    await assertSchemaReady('employees');

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT ea.id, ea.employee_id, e.employee_code, ea.work_date, ea.check_in_time, ea.lunch_out_time, ea.lunch_in_time, ea.check_out_time,
              ea.status, ea.total_hours, ea.ot_hours, ea.note, ea.created_at, ea.updated_at
       FROM employee_attendance ea
       LEFT JOIN employees e ON e.id = ea.employee_id
       ${where.clause}
       ORDER BY ea.work_date DESC, ea.created_at DESC
       LIMIT 5000`,
      where.params
    );

    return json({
      success: true,
      logs: rows.map((row) => normalizeAttendanceLogRow({
        ...row,
        employee_code: row.employee_code,
        work_date: row.work_date,
        check_in_time: row.check_in_time,
        lunch_out_time: row.lunch_out_time,
        lunch_in_time: row.lunch_in_time,
        check_out_time: row.check_out_time,
        total_hours: row.total_hours,
        ot_hours: row.ot_hours,
      })),
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[attendance-logs] GET failed', error);
    return json({ error: 'Attendance service unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requirePermission(request, 'employees.attendance');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const log = normalizeAttendanceLogInput(body);
    if (!log.employeeId || !log.date) {
      return json({ error: 'employeeId and date are required' }, { status: 400 });
    }

    await assertSchemaReady('employees');
    const beforeRows = await query(
      `SELECT ea.id, ea.employee_id, e.employee_code, ea.work_date, ea.check_in_time, ea.lunch_out_time, ea.lunch_in_time, ea.check_out_time,
              ea.status, ea.total_hours, ea.ot_hours, ea.note, ea.created_at, ea.updated_at
       FROM employee_attendance ea
       LEFT JOIN employees e ON e.id = ea.employee_id
       WHERE ea.id = ?
       LIMIT 1`,
      [log.id]
    );
    const previousLog = Array.isArray(beforeRows) && beforeRows.length ? normalizeAttendanceLogRow(beforeRows[0]) : null;
    await query(
      `INSERT INTO employee_attendance (
        id, employee_id, work_date, check_in_time, lunch_out_time, lunch_in_time, check_out_time,
        status, total_hours, ot_hours, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        work_date = VALUES(work_date),
        check_in_time = VALUES(check_in_time),
        lunch_out_time = VALUES(lunch_out_time),
        lunch_in_time = VALUES(lunch_in_time),
        check_out_time = VALUES(check_out_time),
        status = VALUES(status),
        total_hours = VALUES(total_hours),
        ot_hours = VALUES(ot_hours),
        note = VALUES(note)`,
      [
        log.id,
        log.employeeId,
        log.date,
        log.morningIn,
        log.lunchOut,
        log.afternoonIn,
        log.eveningOut,
        log.status,
        log.hours,
        log.otHours,
        log.note,
        log.createdAt,
      ]
    );

    const rows = await query(
      `SELECT ea.id, ea.employee_id, e.employee_code, ea.work_date, ea.check_in_time, ea.lunch_out_time, ea.lunch_in_time, ea.check_out_time,
              ea.status, ea.total_hours, ea.ot_hours, ea.note, ea.created_at, ea.updated_at
       FROM employee_attendance ea
       LEFT JOIN employees e ON e.id = ea.employee_id
       WHERE ea.id = ?
       LIMIT 1`,
      [log.id]
    );

    const savedLog = normalizeAttendanceLogRow(rows[0] || log);
    await insertAuditLogSafe({
      action: previousLog ? 'UPDATE' : 'CREATE',
      module: 'ATTENDANCE',
      entityType: 'EMPLOYEE_ATTENDANCE',
      entityId: savedLog.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: `${savedLog.employeeCode || savedLog.employeeId} ${savedLog.date}`.trim(),
        beforeData: previousLog,
        afterData: savedLog,
      },
    });

    return json({ success: true, log: savedLog }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[attendance-logs] POST failed', error);
    return json({ error: 'Unable to save attendance log' }, { status: 503 });
  }
}

export async function PUT(request) {
  return POST(request);
}

export async function PATCH(request) {
  return POST(request);
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'employees.attendance');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await assertSchemaReady('employees');
    const rows = await query(
      `SELECT ea.id, ea.employee_id, e.employee_code, ea.work_date, ea.check_in_time, ea.lunch_out_time, ea.lunch_in_time, ea.check_out_time,
              ea.status, ea.total_hours, ea.ot_hours, ea.note, ea.created_at, ea.updated_at
       FROM employee_attendance ea
       LEFT JOIN employees e ON e.id = ea.employee_id
       WHERE ea.id = ?
       LIMIT 1`,
      [id]
    );
    const previousLog = Array.isArray(rows) && rows.length ? normalizeAttendanceLogRow(rows[0]) : null;
    await query('DELETE FROM employee_attendance WHERE id = ?', [id]);
    if (previousLog) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'ATTENDANCE',
        entityType: 'EMPLOYEE_ATTENDANCE',
        entityId: previousLog.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: `${previousLog.employeeCode || previousLog.employeeId} ${previousLog.date}`.trim(),
          beforeData: previousLog,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[attendance-logs] DELETE failed', error);
    return json({ error: 'Unable to delete attendance log' }, { status: 503 });
  }
}
