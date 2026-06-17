import {
  cleanString,
  ensureEmployeePositionsTable,
  isAuthorizedToken,
  normalizeEmployeePositionInput,
  normalizeEmployeePositionRow,
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
    await ensureEmployeePositionsTable();

    const rows = await query(
      `SELECT id, name, sort_order, active, created_at, updated_at
       FROM employee_positions
       ORDER BY sort_order ASC, name ASC`
    );

    return json({ success: true, positions: rows.map(normalizeEmployeePositionRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[employee-positions] GET failed', error);
    return json({ error: 'Employee positions service unavailable' }, { status: 503 });
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

    await ensureEmployeePositionsTable();
    const position = normalizeEmployeePositionInput(body);
    if (!position.name) return json({ error: 'Position name is required' }, { status: 400 });

    const existingRows = await query(
      'SELECT id FROM employee_positions WHERE name = ? LIMIT 1',
      [position.name]
    );
    const existingId = existingRows[0]?.id;
    const id = existingId || position.id;

    await query(
      `INSERT INTO employee_positions (id, name, sort_order, active)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         sort_order = VALUES(sort_order),
         active = VALUES(active)`,
      [id, position.name, position.sortOrder, position.active ? 1 : 0]
    );

    const rows = await query(
      `SELECT id, name, sort_order, active, created_at, updated_at
       FROM employee_positions
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return json({ success: true, position: normalizeEmployeePositionRow(rows[0] || { ...position, id }) }, { status: 200 });
  } catch (error) {
    console.error('[employee-positions] POST failed', error);
    return json({ error: 'Unable to save employee position' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await ensureEmployeePositionsTable();
    await query('DELETE FROM employee_positions WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[employee-positions] DELETE failed', error);
    return json({ error: 'Unable to delete employee position' }, { status: 503 });
  }
}

