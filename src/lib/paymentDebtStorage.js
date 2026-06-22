import { query } from './db';

export const DEBT_STATUS_PENDING = 'ค้างจ่าย';
export const DEBT_STATUS_PARTIAL = 'ชำระบางส่วน';
export const DEBT_STATUS_PAID = 'ชำระครบแล้ว';

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanNullable(value, maxLength = 255) {
  const text = cleanString(value, maxLength);
  return text || null;
}

function normalizeMoney(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
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

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatSqlTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function cleanReceiptUrl(value) {
  const text = cleanString(value, 500);
  if (!text) return null;
  if (text.startsWith('data:')) return { error: 'Receipt image must be uploaded before saving' };
  if (/^\/api\/receipts\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(text)) return text;
  if (/^\/uploads\/receipts\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? text : { error: 'Invalid receipt image URL' };
  } catch {
    return { error: 'Invalid receipt image URL' };
  }
}

async function ensureColumn(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (Number(error?.errno || 0) !== 1060) throw error;
  }
}

async function ensureIndex(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (![1061, 1062].includes(Number(error?.errno || 0))) throw error;
  }
}

export function calculateDebtStatus(totalAmount, paidAmount) {
  const total = normalizeMoney(totalAmount, 0);
  const paid = Math.min(normalizeMoney(paidAmount, 0), total);
  const balance = Math.max(0, Number((total - paid).toFixed(2)));
  if (balance <= 0 && total > 0) return DEBT_STATUS_PAID;
  if (paid > 0) return DEBT_STATUS_PARTIAL;
  return DEBT_STATUS_PENDING;
}

export async function ensurePaymentDebtTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS payment_debts (
      id VARCHAR(64) PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NULL,
      case_reference VARCHAR(255) NULL,
      total_amount DECIMAL(12,2) DEFAULT 0,
      paid_amount DECIMAL(12,2) DEFAULT 0,
      balance_amount DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(64) NULL,
      due_date DATE NULL,
      payment_method VARCHAR(100) NULL,
      description TEXT NULL,
      note TEXT NULL,
      receipt_image_url TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payment_debts_status (status),
      INDEX idx_payment_debts_due_date (due_date),
      INDEX idx_payment_debts_customer_name (customer_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payment_debt_payments (
      id VARCHAR(64) PRIMARY KEY,
      debt_id VARCHAR(64) NOT NULL,
      payment_date DATE NOT NULL,
      payment_time TIME NULL,
      amount DECIMAL(12,2) DEFAULT 0,
      payment_method VARCHAR(100) NULL,
      note TEXT NULL,
      receipt_image_url TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payment_debt_payments_debt_id (debt_id),
      INDEX idx_payment_debt_payments_date (payment_date),
      CONSTRAINT fk_payment_debt_payments_debt_id
        FOREIGN KEY (debt_id) REFERENCES payment_debts(id)
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE payment_debts ADD COLUMN phone VARCHAR(64) NULL');
  await ensureColumn('ALTER TABLE payment_debts ADD COLUMN case_reference VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE payment_debts ADD COLUMN receipt_image_url TEXT NULL');
  await ensureColumn('ALTER TABLE payment_debt_payments ADD COLUMN receipt_image_url TEXT NULL');
  await ensureIndex('CREATE INDEX idx_payment_debts_status ON payment_debts(status)');
  await ensureIndex('CREATE INDEX idx_payment_debts_due_date ON payment_debts(due_date)');
}

export function normalizePaymentDebtInput(body = {}) {
  const totalAmount = normalizeMoney(body.total_amount ?? body.totalAmount, 0);
  const paidAmount = Math.min(normalizeMoney(body.paid_amount ?? body.paidAmount, 0), totalAmount);
  const balanceAmount = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));
  const receiptImageUrl = cleanReceiptUrl(body.receipt_image_url || body.receiptUrl || body.receipt_url);
  if (receiptImageUrl && typeof receiptImageUrl === 'object' && receiptImageUrl.error) return { error: receiptImageUrl.error };

  return {
    id: cleanString(body.id, 64) || `debt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customer_name: cleanString(body.customer_name || body.customerName, 255),
    phone: cleanNullable(body.phone, 64),
    case_reference: cleanNullable(body.case_reference || body.caseReference, 255),
    total_amount: totalAmount,
    paid_amount: paidAmount,
    balance_amount: balanceAmount,
    status: calculateDebtStatus(totalAmount, paidAmount),
    due_date: cleanDate(body.due_date || body.dueDate),
    payment_method: cleanNullable(body.payment_method || body.paymentMethod, 100),
    description: cleanNullable(body.description, 5000),
    note: cleanNullable(body.note, 5000),
    receipt_image_url: receiptImageUrl,
  };
}

export function normalizeDebtPaymentInput(body = {}, debtId = '') {
  const amount = normalizeMoney(body.amount, 0);
  const receiptImageUrl = cleanReceiptUrl(body.receipt_image_url || body.receiptUrl || body.receipt_url);
  if (receiptImageUrl && typeof receiptImageUrl === 'object' && receiptImageUrl.error) return { error: receiptImageUrl.error };
  return {
    id: cleanString(body.id, 64) || `debt-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    debt_id: cleanString(body.debt_id || body.debtId || debtId, 64),
    payment_date: cleanDate(body.payment_date || body.paymentDate || body.date) || new Date().toISOString().slice(0, 10),
    payment_time: cleanTime(body.payment_time || body.paymentTime || body.time),
    amount,
    payment_method: cleanNullable(body.payment_method || body.paymentMethod, 100),
    note: cleanNullable(body.note, 5000),
    receipt_image_url: receiptImageUrl,
  };
}

export function normalizePaymentDebtRow(row = {}, payments = []) {
  return {
    id: row.id,
    customer_name: row.customer_name || '',
    phone: row.phone || '',
    case_reference: row.case_reference || '',
    total_amount: Number(row.total_amount || 0),
    paid_amount: Number(row.paid_amount || 0),
    balance_amount: Number(row.balance_amount || 0),
    status: row.status || calculateDebtStatus(row.total_amount, row.paid_amount),
    due_date: formatSqlDate(row.due_date),
    payment_method: row.payment_method || '',
    description: row.description || '',
    note: row.note || '',
    receipt_image_url: row.receipt_image_url || '',
    payments,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export function normalizeDebtPaymentRow(row = {}) {
  return {
    id: row.id,
    debt_id: row.debt_id,
    payment_date: formatSqlDate(row.payment_date),
    payment_time: formatSqlTime(row.payment_time),
    amount: Number(row.amount || 0),
    payment_method: row.payment_method || '',
    note: row.note || '',
    receipt_image_url: row.receipt_image_url || '',
    created_at: row.created_at || null,
  };
}

export async function getPaymentDebts(filters = {}) {
  await ensurePaymentDebtTables();
  const where = [];
  const params = [];
  if (filters.search) {
    const like = `%${String(filters.search).toLowerCase()}%`;
    where.push(`(
      LOWER(COALESCE(customer_name, '')) LIKE ?
      OR LOWER(COALESCE(phone, '')) LIKE ?
      OR LOWER(COALESCE(case_reference, '')) LIKE ?
      OR LOWER(COALESCE(description, '')) LIKE ?
    )`);
    params.push(like, like, like, like);
  }
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'open') where.push('balance_amount > 0');
    else {
      where.push('status = ?');
      params.push(filters.status);
    }
  }
  const rows = await query(
    `SELECT * FROM payment_debts
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY COALESCE(due_date, created_at) ASC, created_at DESC
     LIMIT 2000`,
    params
  );
  if (!rows.length) return [];
  const debtIds = rows.map((row) => row.id);
  const placeholders = debtIds.map(() => '?').join(',');
  const paymentRows = await query(
    `SELECT * FROM payment_debt_payments WHERE debt_id IN (${placeholders}) ORDER BY payment_date DESC, created_at DESC`,
    debtIds
  );
  const paymentMap = new Map();
  for (const payment of paymentRows.map(normalizeDebtPaymentRow)) {
    const current = paymentMap.get(payment.debt_id) || [];
    current.push(payment);
    paymentMap.set(payment.debt_id, current);
  }
  return rows.map((row) => normalizePaymentDebtRow(row, paymentMap.get(row.id) || []));
}

export async function getPaymentDebtById(id) {
  await ensurePaymentDebtTables();
  const rows = await query('SELECT * FROM payment_debts WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) return null;
  const paymentRows = await query('SELECT * FROM payment_debt_payments WHERE debt_id = ? ORDER BY payment_date DESC, created_at DESC', [id]);
  return normalizePaymentDebtRow(rows[0], paymentRows.map(normalizeDebtPaymentRow));
}

export async function savePaymentDebt(body = {}) {
  await ensurePaymentDebtTables();
  const debt = normalizePaymentDebtInput(body);
  if (debt.error) return debt;
  await query(
    `INSERT INTO payment_debts (
      id, customer_name, phone, case_reference, total_amount, paid_amount, balance_amount, status,
      due_date, payment_method, description, note, receipt_image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      customer_name = VALUES(customer_name),
      phone = VALUES(phone),
      case_reference = VALUES(case_reference),
      total_amount = VALUES(total_amount),
      paid_amount = VALUES(paid_amount),
      balance_amount = VALUES(balance_amount),
      status = VALUES(status),
      due_date = VALUES(due_date),
      payment_method = VALUES(payment_method),
      description = VALUES(description),
      note = VALUES(note),
      receipt_image_url = VALUES(receipt_image_url)`,
    [
      debt.id,
      debt.customer_name,
      debt.phone,
      debt.case_reference,
      debt.total_amount,
      debt.paid_amount,
      debt.balance_amount,
      debt.status,
      debt.due_date,
      debt.payment_method,
      debt.description,
      debt.note,
      debt.receipt_image_url,
    ]
  );
  return getPaymentDebtById(debt.id);
}

export async function addDebtPayment(debtId, body = {}) {
  await ensurePaymentDebtTables();
  const debt = await getPaymentDebtById(debtId);
  if (!debt) return { error: 'Payment debt not found' };
  const payment = normalizeDebtPaymentInput(body, debtId);
  if (payment.error) return payment;
  if (payment.amount <= 0) return { error: 'Payment amount must be greater than zero' };

  const nextPaid = Math.min(debt.total_amount, Number((debt.paid_amount + payment.amount).toFixed(2)));
  const nextBalance = Math.max(0, Number((debt.total_amount - nextPaid).toFixed(2)));
  const nextStatus = calculateDebtStatus(debt.total_amount, nextPaid);

  await query(
    `INSERT INTO payment_debt_payments (
      id, debt_id, payment_date, payment_time, amount, payment_method, note, receipt_image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment.id,
      payment.debt_id,
      payment.payment_date,
      payment.payment_time,
      payment.amount,
      payment.payment_method,
      payment.note,
      payment.receipt_image_url,
    ]
  );

  await query(
    `UPDATE payment_debts
     SET paid_amount = ?, balance_amount = ?, status = ?
     WHERE id = ?`,
    [nextPaid, nextBalance, nextStatus, debtId]
  );

  return getPaymentDebtById(debtId);
}

export { cleanString };
