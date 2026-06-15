import {
  cleanString,
  ensureEmployeesTable,
  isAuthorizedToken,
  normalizeEmployeeInput,
  normalizeEmployeeRow,
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
  const status = cleanString(url.searchParams.get('status'), 100);
  const position = cleanString(url.searchParams.get('position'), 255);
  const active = cleanString(url.searchParams.get('active'), 16).toLowerCase();
  const search = cleanString(url.searchParams.get('search'), 100).toLowerCase();

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (position) {
    where.push('position = ?');
    params.push(position);
  }
  if (active === '1' || active === 'true') {
    where.push('active = 1');
  } else if (active === '0' || active === 'false') {
    where.push('active = 0');
  }
  if (search) {
    const like = `%${search}%`;
    where.push(`(
      LOWER(COALESCE(code, '')) LIKE ?
      OR LOWER(COALESCE(name, '')) LIKE ?
      OR LOWER(COALESCE(first_name, '')) LIKE ?
      OR LOWER(COALESCE(last_name, '')) LIKE ?
      OR LOWER(COALESCE(nickname, '')) LIKE ?
      OR LOWER(COALESCE(position, '')) LIKE ?
    )`);
    params.push(like, like, like, like, like, like);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function GET(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureEmployeesTable();

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT id, code, status, first_name, last_name, nickname, position, role, active, createdAt, updatedAt
       FROM employees
       ${where.clause}
       ORDER BY createdAt DESC
       LIMIT 2000`,
      where.params
    );

    return json({ success: true, employees: rows.map(normalizeEmployeeRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[employees] GET failed', error);
    return json({ error: 'Employee service unavailable' }, { status: 503 });
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

    const employee = normalizeEmployeeInput(body);
    if (!employee.code || !employee.firstName || !employee.lastName || !employee.nickname || !employee.position) {
      return json({ error: 'Missing required employee fields' }, { status: 400 });
    }

    await ensureEmployeesTable();
    await query(
      `INSERT INTO employees (
        id, code, name, role, active, status, first_name, last_name, nickname, position, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        name = VALUES(name),
        role = COALESCE(VALUES(role), role),
        active = VALUES(active),
        status = VALUES(status),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        nickname = VALUES(nickname),
        position = VALUES(position)`,
      [
        employee.id,
        employee.code,
        employee.name,
        employee.role,
        employee.active ? 1 : 0,
        employee.status,
        employee.firstName,
        employee.lastName,
        employee.nickname,
        employee.position,
        employee.createdAt,
      ]
    );

    const rows = await query(
      `SELECT id, code, status, first_name, last_name, nickname, position, role, active, createdAt, updatedAt
       FROM employees
       WHERE id = ?
       LIMIT 1`,
      [employee.id]
    );

    return json({ success: true, employee: normalizeEmployeeRow(rows[0] || employee) }, { status: 200 });
  } catch (error) {
    console.error('[employees] POST failed', error);
    return json({ error: 'Unable to save employee' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await ensureEmployeesTable();
    await query('DELETE FROM employees WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[employees] DELETE failed', error);
    return json({ error: 'Unable to delete employee' }, { status: 503 });
  }
}
