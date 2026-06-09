import { query } from '../../../../lib/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function getContentLength(request) {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return 0;
  const length = Number(rawLength);
  return Number.isFinite(length) ? length : 0;
}

async function ensureEmployeesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(100),
      active TINYINT(1) NOT NULL DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY idx_employees_code (code(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await query('ALTER TABLE employees ADD UNIQUE KEY idx_employees_code (code(255))');
  } catch (error) {
    if (![1061, 1062].includes(Number(error?.errno || 0))) {
      console.warn('[admin/validate] unable to ensure employees.code index', error);
    }
  }

  await query(
    `INSERT IGNORE INTO employees (id, code, name, role, active)
     VALUES (?, ?, ?, ?, 1)`,
    ['emp-default', 'jBm1679800329229#ProAuto!', 'พนักงานอู่', 'admin']
  );
}

export async function POST(request) {
  if (getContentLength(request) > MAX_REQUEST_BYTES) {
    return json({ error: 'Request body too large' }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const code = String(body?.code || '').trim();
  if (!code) return json({ error: 'กรุณากรอกรหัสพนักงาน' }, { status: 400 });

  try {
    await ensureEmployeesTable();
    const rows = await query(
      'SELECT id, code, name, role, active FROM employees WHERE code = ? AND active = 1 LIMIT 1',
      [code]
    );
    const employee = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!employee) return json({ error: 'รหัสพนักงานไม่ถูกต้อง' }, { status: 403 });

    return json({
      success: true,
      employee: {
        id: employee.id,
        code: employee.code,
        name: employee.name,
        role: employee.role,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[admin/validate] POST failed', error);
    return json({ error: 'ระบบตรวจสอบรหัสพนักงานไม่พร้อมใช้งาน' }, { status: 503 });
  }
}
