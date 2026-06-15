import {
  buildYearMonthDayFilters,
  cleanString,
  ensureAttendanceLogsTable,
  isAuthorizedToken,
  normalizeAttendanceLogInput,
  normalizeAttendanceLogRow,
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
  const status = cleanString(url.searchParams.get('status'), 100);
  const method = cleanString(url.searchParams.get('method'), 100);
  const dateFilters = buildYearMonthDayFilters(url, 'date');

  if (employeeId) {
    where.push('employee_id = ?');
    params.push(employeeId);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (method) {
    where.push('method = ?');
    params.push(method);
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
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureAttendanceLogsTable();

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT id, employee_id, employee_code, date, morning_in, lunch_out, afternoon_in, evening_out,
              method, status, hours, source, createdAt, updatedAt
       FROM attendance_logs
       ${where.clause}
       ORDER BY date DESC, createdAt DESC
       LIMIT 5000`,
      where.params
    );

    return json({ success: true, logs: rows.map(normalizeAttendanceLogRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[attendance-logs] GET failed', error);
    return json({ error: 'Attendance service unavailable' }, { status: 503 });
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

    const log = normalizeAttendanceLogInput(body);
    if (!log.employeeId || !log.date) {
      return json({ error: 'employeeId and date are required' }, { status: 400 });
    }

    await ensureAttendanceLogsTable();
    await query(
      `INSERT INTO attendance_logs (
        id, employee_id, employee_code, date, morning_in, lunch_out, afternoon_in, evening_out,
        method, status, hours, source, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        employee_code = VALUES(employee_code),
        date = VALUES(date),
        morning_in = VALUES(morning_in),
        lunch_out = VALUES(lunch_out),
        afternoon_in = VALUES(afternoon_in),
        evening_out = VALUES(evening_out),
        method = VALUES(method),
        status = VALUES(status),
        hours = VALUES(hours),
        source = VALUES(source)`,
      [
        log.id,
        log.employeeId,
        log.employeeCode,
        log.date,
        log.morningIn,
        log.lunchOut,
        log.afternoonIn,
        log.eveningOut,
        log.method,
        log.status,
        log.hours,
        log.source,
        log.createdAt,
      ]
    );

    const rows = await query(
      `SELECT id, employee_id, employee_code, date, morning_in, lunch_out, afternoon_in, evening_out,
              method, status, hours, source, createdAt, updatedAt
       FROM attendance_logs
       WHERE id = ?
       LIMIT 1`,
      [log.id]
    );

    return json({ success: true, log: normalizeAttendanceLogRow(rows[0] || log) }, { status: 200 });
  } catch (error) {
    console.error('[attendance-logs] POST failed', error);
    return json({ error: 'Unable to save attendance log' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await ensureAttendanceLogsTable();
    await query('DELETE FROM attendance_logs WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[attendance-logs] DELETE failed', error);
    return json({ error: 'Unable to delete attendance log' }, { status: 503 });
  }
}
