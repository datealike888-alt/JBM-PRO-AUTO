import { query } from '../../../lib/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const TYPE_OPTIONS = new Set(['income', 'expense']);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanDate(value) {
  const text = cleanString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanTime(value) {
  const text = cleanString(value, 8);
  if (!text) return null;
  if (/^\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  return null;
}

function normalizeAmount(value) {
  const amount = Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) ? amount : null;
}

function normalizeYear(value) {
  const year = cleanString(value, 4);
  if (!/^\d{4}$/.test(year)) return '';
  const numberYear = Number(year);
  if (numberYear >= 2568 && numberYear <= 2579) return String(numberYear - 543);
  return year;
}

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatSqlTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

async function ensureIndex(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (![1061, 1062].includes(Number(error?.errno || 0))) throw error;
  }
}

async function ensureFinancialTransactionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id VARCHAR(64) PRIMARY KEY,
      date DATE NOT NULL,
      time TIME NULL,
      type ENUM('income','expense') NOT NULL,
      payment_method VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureIndex('CREATE INDEX idx_financial_transactions_date ON financial_transactions(date)');
  await ensureIndex('CREATE INDEX idx_financial_transactions_type ON financial_transactions(type)');
  await ensureIndex('CREATE INDEX idx_financial_transactions_payment_method ON financial_transactions(payment_method)');
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

  await ensureIndex('ALTER TABLE employees ADD UNIQUE KEY idx_employees_code (code(255))');
  await query(
    `INSERT IGNORE INTO employees (id, code, name, role, active)
     VALUES (?, ?, ?, ?, 1)`,
    ['emp-default', 'jBm1679800329229#ProAuto!', 'พนักงานอู่', 'admin']
  );
}

async function isAuthorizedToken(request) {
  const suppliedToken = cleanString(request.headers.get('x-vehicle-admin-token'), 255);
  if (!suppliedToken) return false;
  const configuredToken = process.env.VEHICLE_ADMIN_TOKEN;
  if (configuredToken && suppliedToken === configuredToken) return true;

  await ensureEmployeesTable();
  const rows = await query(
    'SELECT id FROM employees WHERE code = ? AND active = 1 LIMIT 1',
    [suppliedToken]
  );
  return Array.isArray(rows) && rows.length > 0;
}

function normalizeRow(row) {
  return {
    id: row.id,
    date: formatSqlDate(row.date),
    time: formatSqlTime(row.time),
    type: TYPE_OPTIONS.has(row.type) ? row.type : 'income',
    payment_method: row.payment_method || '',
    description: row.description || '',
    amount: Number(row.amount || 0),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function normalizeBody(body) {
  if (!body || typeof body !== 'object') return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };

  const date = cleanDate(body.date);
  if (!date) return { error: 'กรุณาระบุวันที่ทำรายการให้ถูกต้อง' };

  const type = cleanString(body.type, 16);
  if (!TYPE_OPTIONS.has(type)) return { error: 'ประเภทต้องเป็น income หรือ expense เท่านั้น' };

  const paymentMethod = cleanString(body.payment_method, 100);
  if (!paymentMethod) return { error: 'กรุณาระบุช่องทางการเงิน' };

  const description = cleanString(body.description, 5000);
  if (!description) return { error: 'กรุณาระบุรายละเอียด' };

  const amount = normalizeAmount(body.amount);
  if (amount === null || amount < 0) return { error: 'จำนวนเงินต้องเป็นตัวเลขไม่ติดลบ' };

  const id = cleanString(body.id, 64) || `fin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    transaction: {
      id,
      date,
      time: cleanTime(body.time),
      type,
      payment_method: paymentMethod,
      description,
      amount,
    },
  };
}

function buildWhere(url) {
  const where = [];
  const params = [];
  const search = cleanString(url.searchParams.get('search'), 100);
  const type = cleanString(url.searchParams.get('type'), 16);
  const paymentMethod = cleanString(url.searchParams.get('payment_method'), 100);
  const day = cleanString(url.searchParams.get('day'), 2);
  const month = cleanString(url.searchParams.get('month'), 2);
  const year = normalizeYear(url.searchParams.get('year'));

  if (search) {
    where.push('(LOWER(description) LIKE ? OR LOWER(payment_method) LIKE ?)');
    const like = `%${search.toLowerCase()}%`;
    params.push(like, like);
  }
  if (TYPE_OPTIONS.has(type)) {
    where.push('type = ?');
    params.push(type);
  }
  if (paymentMethod) {
    where.push('payment_method = ?');
    params.push(paymentMethod);
  }
  if (/^\d{4}$/.test(year)) {
    where.push('YEAR(date) = ?');
    params.push(year);
  }
  if (/^\d{2}$/.test(month)) {
    where.push('MONTH(date) = ?');
    params.push(month);
  }
  if (/^\d{2}$/.test(day)) {
    where.push('DAY(date) = ?');
    params.push(day);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function GET(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'ไม่มีสิทธิ์ใช้งานข้อมูลการเงิน' }, { status: 403 });
    await ensureFinancialTransactionsTable();

    const url = new URL(request.url);
    const where = buildWhere(url);
    const rows = await query(
      `SELECT * FROM financial_transactions
       ${where.clause}
       ORDER BY date DESC, COALESCE(time, '23:59:59') DESC, created_at DESC
       LIMIT 2000`,
      where.params
    );

    return json({ success: true, transactions: rows.map(normalizeRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[financial-transactions] GET failed', error);
    return json({ error: 'ระบบการเงินยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'ไม่มีสิทธิ์บันทึกข้อมูลการเงิน' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
    }

    const normalized = normalizeBody(body);
    if (normalized.error) return json({ error: normalized.error }, { status: 400 });
    const { transaction } = normalized;

    await ensureFinancialTransactionsTable();
    await query(
      `INSERT INTO financial_transactions (
        id, date, time, type, payment_method, description, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        date = VALUES(date),
        time = VALUES(time),
        type = VALUES(type),
        payment_method = VALUES(payment_method),
        description = VALUES(description),
        amount = VALUES(amount)`,
      [
        transaction.id,
        transaction.date,
        transaction.time,
        transaction.type,
        transaction.payment_method,
        transaction.description,
        transaction.amount,
      ]
    );

    return json({ success: true, transaction }, { status: 200 });
  } catch (error) {
    console.error('[financial-transactions] POST failed', error);
    return json({ error: 'บันทึกรายการการเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) return json({ error: 'ไม่มีสิทธิ์ลบข้อมูลการเงิน' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'กรุณาระบุ id ของรายการที่ต้องการลบ' }, { status: 400 });

    await ensureFinancialTransactionsTable();
    await query('DELETE FROM financial_transactions WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[financial-transactions] DELETE failed', error);
    return json({ error: 'ลบรายการการเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}
