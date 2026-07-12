import {
  cleanString,
  isAuthorizedToken,
  normalizeEmployeeInput,
  normalizeEmployeeRow,
  query,
} from '../../../lib/employeeStorage';
import { assertSchemaReady, handleSchemaError } from '../../../lib/schemaReadiness';
import { getAuthorizedAdminFromRequest } from '../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import { requirePermission, requireAnyPermission } from '../../../lib/adminPermissions';

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
  const search = cleanString(url.searchParams.get('search'), 100).toLowerCase();

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (position) {
    where.push('position = ?');
    params.push(position);
  }
  if (search) {
    const like = `%${search}%`;
    where.push(`(
      LOWER(COALESCE(employee_code, '')) LIKE ?
      OR LOWER(COALESCE(first_name, '')) LIKE ?
      OR LOWER(COALESCE(last_name, '')) LIKE ?
      OR LOWER(COALESCE(nickname, '')) LIKE ?
      OR LOWER(COALESCE(position, '')) LIKE ?
      OR LOWER(COALESCE(phone, '')) LIKE ?
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
    const authResult = await requirePermission(request, 'employees.view');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    await assertSchemaReady('employees');

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT id, COALESCE(employee_code, code) AS employee_code, status, first_name, last_name, nickname, position, phone, photo_url, start_date, note, created_at, updated_at
       FROM employees
       ${where.clause}
       ORDER BY created_at DESC
       LIMIT 2000`,
      where.params
    );

    return json({ success: true, employees: rows.map(normalizeEmployeeRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[employees] GET failed', error);
    return json({ error: 'Employee service unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requireAnyPermission(request, ['employees.create', 'employees.update']);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const employee = normalizeEmployeeInput(body);
    if (!employee.employeeCode || !employee.firstName || !employee.lastName || !employee.nickname || !employee.position) {
      return json({ error: 'Missing required employee fields' }, { status: 400 });
    }

    await assertSchemaReady('employees');

    const existingRows = await query(
      'SELECT id FROM employees WHERE employee_code = ? AND id != ? LIMIT 1',
      [employee.employeeCode, employee.id || '']
    );
    if (existingRows.length > 0) {
      return json({ error: 'Employee code already exists' }, { status: 409 });
    }

    const beforeRows = await query(
      `SELECT id, COALESCE(employee_code, code) AS employee_code, status, first_name, last_name, nickname, position, phone, photo_url, start_date, note, created_at, updated_at
       FROM employees
       WHERE id = ?
       LIMIT 1`,
      [employee.id]
    );
    const previousEmployee = Array.isArray(beforeRows) && beforeRows.length ? normalizeEmployeeRow(beforeRows[0]) : null;
    await query(
      `INSERT INTO employees (
        id, employee_code, code, name, role, active, status, first_name, last_name, nickname, position, phone, photo_url, start_date, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        employee_code = VALUES(employee_code),
        code = VALUES(code),
        name = VALUES(name),
        role = VALUES(role),
        active = VALUES(active),
        status = VALUES(status),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        nickname = VALUES(nickname),
        position = VALUES(position),
        phone = VALUES(phone),
        photo_url = VALUES(photo_url),
        start_date = VALUES(start_date),
        note = VALUES(note)`,
      [
        employee.id,
        employee.employeeCode,
        employee.employeeCode,
        `${employee.firstName} ${employee.lastName}`.trim() || employee.employeeCode,
        null,
        employee.status === 'ลาออก' ? 0 : 1,
        employee.status,
        employee.firstName,
        employee.lastName,
        employee.nickname,
        employee.position,
        employee.phone,
        employee.photoUrl,
        employee.startDate,
        employee.note,
        employee.createdAt,
      ]
    );

    const rows = await query(
      `SELECT id, COALESCE(employee_code, code) AS employee_code, status, first_name, last_name, nickname, position, phone, photo_url, start_date, note, created_at, updated_at
       FROM employees
       WHERE employee_code = ?
       LIMIT 1`,
      [employee.employeeCode]
    );

    const savedEmployee = normalizeEmployeeRow(rows[0] || employee);
    await insertAuditLogSafe({
      action: previousEmployee ? 'UPDATE' : 'CREATE',
      module: 'EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: savedEmployee.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: `${savedEmployee.code} ${savedEmployee.firstName} ${savedEmployee.lastName}`.trim(),
        beforeData: previousEmployee,
        afterData: savedEmployee,
      },
    });

    return json({ success: true, employee: savedEmployee }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[employees] POST failed', error);
    return json({ error: 'Unable to save employee' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'employees.delete');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await assertSchemaReady('employees');
    const rows = await query(
      `SELECT id, COALESCE(employee_code, code) AS employee_code, status, first_name, last_name, nickname, position, phone, photo_url, start_date, note, created_at, updated_at
       FROM employees
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    const previousEmployee = Array.isArray(rows) && rows.length ? normalizeEmployeeRow(rows[0]) : null;
    await query('DELETE FROM employees WHERE id = ?', [id]);
    if (previousEmployee) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'EMPLOYEE',
        entityType: 'EMPLOYEE',
        entityId: previousEmployee.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: `${previousEmployee.code} ${previousEmployee.firstName} ${previousEmployee.lastName}`.trim(),
          beforeData: previousEmployee,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[employees] DELETE failed', error);
    return json({ error: 'Unable to delete employee' }, { status: 503 });
  }
}
