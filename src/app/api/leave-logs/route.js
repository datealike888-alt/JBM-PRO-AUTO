import {
  buildYearMonthDayFilters,
  cleanString,
  ensureLeaveLogsTable,
  isAuthorizedToken,
  normalizeLeaveLogInput,
  normalizeLeaveLogRow,
  query,
} from '../../../lib/employeeStorage';

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
  const submittedFilters = buildYearMonthDayFilters(url, 'submitted_at');

  if (employeeId) {
    where.push('employee_id = ?');
    params.push(employeeId);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
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
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureLeaveLogsTable();

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT id, employee_id, employee_code, type, start_date, end_date, total_days, approver,
              reason, submitted_at, source, createdAt, updatedAt
       FROM leave_logs
       ${where.clause}
       ORDER BY submitted_at DESC, createdAt DESC
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
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });

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
    await query(
      `INSERT INTO leave_logs (
        id, employee_id, employee_code, type, start_date, end_date, total_days, approver,
        reason, submitted_at, source, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        employee_code = VALUES(employee_code),
        type = VALUES(type),
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        total_days = VALUES(total_days),
        approver = VALUES(approver),
        reason = VALUES(reason),
        submitted_at = VALUES(submitted_at),
        source = VALUES(source)`,
      [
        log.id,
        log.employeeId,
        log.employeeCode,
        log.type,
        log.startDate,
        log.endDate,
        log.totalDays,
        log.approver,
        log.reason,
        log.submittedAt,
        log.source,
        log.createdAt,
      ]
    );

    const rows = await query(
      `SELECT id, employee_id, employee_code, type, start_date, end_date, total_days, approver,
              reason, submitted_at, source, createdAt, updatedAt
       FROM leave_logs
       WHERE id = ?
       LIMIT 1`,
      [log.id]
    );

    return json({ success: true, log: normalizeLeaveLogRow(rows[0] || log) }, { status: 200 });
  } catch (error) {
    console.error('[leave-logs] POST failed', error);
    return json({ error: 'Unable to save leave log' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await ensureLeaveLogsTable();
    await query('DELETE FROM leave_logs WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[leave-logs] DELETE failed', error);
    return json({ error: 'Unable to delete leave log' }, { status: 503 });
  }
}
