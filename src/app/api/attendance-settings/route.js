import {
  cleanString,
  ensureAttendanceSettingsTable,
  isAuthorizedToken,
  normalizeAttendanceSettingsInput,
  normalizeAttendanceSettingsRow,
  query,
} from '../../../lib/employeeStorage';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureAttendanceSettingsTable();

    const url = new URL(request.url);
    const employeeId = cleanString(url.searchParams.get('employeeId'), 64);
    const id = cleanString(url.searchParams.get('id'), 64);

    const rows = await query(
      `SELECT id, employee_id, morning_start, morning_late_after, lunch_out, afternoon_start,
              afternoon_late_after, work_end, source, createdAt, updatedAt
       FROM attendance_settings
       WHERE ${id ? 'id = ?' : employeeId ? 'employee_id = ?' : 'id = ?'}
       LIMIT 1`,
      [id || employeeId || 'attendance-settings-default']
    );

    return json({ success: true, settings: rows[0] ? normalizeAttendanceSettingsRow(rows[0]) : null }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[attendance-settings] GET failed', error);
    return json({ error: 'Attendance settings service unavailable' }, { status: 503 });
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

    await ensureAttendanceSettingsTable();
    const settings = normalizeAttendanceSettingsInput(body);

    await query(
      `INSERT INTO attendance_settings (
        id, employee_id, morning_start, morning_late_after, lunch_out, afternoon_start,
        afternoon_late_after, work_end, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        morning_start = VALUES(morning_start),
        morning_late_after = VALUES(morning_late_after),
        lunch_out = VALUES(lunch_out),
        afternoon_start = VALUES(afternoon_start),
        afternoon_late_after = VALUES(afternoon_late_after),
        work_end = VALUES(work_end),
        source = VALUES(source)`,
      [
        settings.id,
        settings.employeeId,
        settings.morningStart,
        settings.morningLateAfter,
        settings.lunchOut,
        settings.afternoonStart,
        settings.afternoonLateAfter,
        settings.workEnd,
        settings.source,
      ]
    );

    const rows = await query(
      `SELECT id, employee_id, morning_start, morning_late_after, lunch_out, afternoon_start,
              afternoon_late_after, work_end, source, createdAt, updatedAt
       FROM attendance_settings
       WHERE id = ?
       LIMIT 1`,
      [settings.id]
    );

    return json({ success: true, settings: normalizeAttendanceSettingsRow(rows[0] || settings) }, { status: 200 });
  } catch (error) {
    console.error('[attendance-settings] POST failed', error);
    return json({ error: 'Unable to save attendance settings' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const id = cleanString(url.searchParams.get('id'), 64);
    const employeeId = cleanString(url.searchParams.get('employeeId'), 64);
    if (!id && !employeeId) return json({ error: 'Missing id or employeeId parameter' }, { status: 400 });

    await ensureAttendanceSettingsTable();
    if (id) {
      await query('DELETE FROM attendance_settings WHERE id = ? AND id <> ?', [id, 'attendance-settings-default']);
    } else {
      await query(
        'DELETE FROM attendance_settings WHERE employee_id = ? AND id <> ?',
        [employeeId, 'attendance-settings-default']
      );
    }

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[attendance-settings] DELETE failed', error);
    return json({ error: 'Unable to delete attendance settings' }, { status: 503 });
  }
}
