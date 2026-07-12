import { query } from './db';
import { assertSchemaReady } from './schemaReadiness';

export const DEBT_STATUS_PENDING = 'ค้างจ่าย';
export const DEBT_STATUS_PARTIAL = 'ชำระบางส่วน';
export const DEBT_STATUS_PAID = 'ชำระครบแล้ว';
export const DEBT_STATUS_WAITING = 'รอชำระ';
export const DEBT_STATUS_OVERDUE = 'เกินกำหนด';
export const DEBT_STATUS_CANCELLED = 'ยกเลิก';
const DEBT_STATUS_VALUES = new Set([
  DEBT_STATUS_PENDING,
  DEBT_STATUS_PARTIAL,
  DEBT_STATUS_PAID,
  DEBT_STATUS_WAITING,
  DEBT_STATUS_OVERDUE,
  DEBT_STATUS_CANCELLED,
]);
const DEBT_STATUS_ALIASES = new Map([
  ['ชำระแล้วบางส่วน', DEBT_STATUS_PARTIAL],
  ['ค้างชำระ', DEBT_STATUS_PENDING],
]);

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

function cleanReceiptImages(value) {
  if (!value) return null;
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      const clean = cleanReceiptUrl(value);
      return clean && !clean.error ? JSON.stringify([clean]) : null;
    }
  }
  if (Array.isArray(parsed)) {
    const validUrls = parsed.map(u => cleanReceiptUrl(u)).filter(u => u && !u.error);
    return validUrls.length > 0 ? JSON.stringify(validUrls) : null;
  }
  return null;
}

export function calculateDebtStatus(totalAmount, paidAmount) {
  const total = normalizeMoney(totalAmount, 0);
  const paid = Math.min(normalizeMoney(paidAmount, 0), total);
  const balance = Math.max(0, Number((total - paid).toFixed(2)));
  if (balance <= 0 && total > 0) return DEBT_STATUS_PAID;
  if (paid > 0) return DEBT_STATUS_PARTIAL;
  return DEBT_STATUS_PENDING;
}

export function normalizeDebtStatus(status, totalAmount, paidAmount) {
  const text = cleanString(status, 64);
  if (DEBT_STATUS_ALIASES.has(text)) return DEBT_STATUS_ALIASES.get(text);
  if (DEBT_STATUS_VALUES.has(text)) return text;
  return calculateDebtStatus(totalAmount, paidAmount);
}

export function normalizePaymentDebtInput(body = {}) {
  const totalAmount = normalizeMoney(body.total_amount ?? body.totalAmount, 0);
  const paidAmount = Math.min(normalizeMoney(body.paid_amount ?? body.paidAmount, 0), totalAmount);
  const balanceAmount = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));
  const receiptImageUrl = cleanReceiptUrl(body.receipt_image_url || body.receiptUrl || body.receipt_url);
  if (receiptImageUrl && typeof receiptImageUrl === 'object' && receiptImageUrl.error) return { error: receiptImageUrl.error };
  const receiptImages = cleanReceiptImages(body.receipt_images || body.receiptImages);

  return {
    id: cleanString(body.id, 64) || `debt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customer_name: cleanString(body.customer_name || body.customerName, 255),
    phone: cleanNullable(body.phone || body.customer_phone || body.customerPhone, 64),
    case_reference: cleanNullable(body.case_reference || body.caseReference || body.vehicle_info || body.vehicleInfo, 255),
    total_amount: totalAmount,
    paid_amount: paidAmount,
    balance_amount: balanceAmount,
    status: normalizeDebtStatus(body.status, totalAmount, paidAmount),
    due_date: cleanDate(body.due_date || body.dueDate),
    payment_method: cleanNullable(body.payment_method || body.paymentMethod, 100),
    description: cleanNullable(body.description, 5000),
    note: cleanNullable(body.note, 5000),
    receipt_image_url: receiptImageUrl,
    receipt_images: receiptImages,
  };
}

export function normalizeDebtPaymentInput(body = {}, debtId = '') {
  const amount = normalizeMoney(body.amount, 0);
  const receiptImageUrl = cleanReceiptUrl(body.receipt_image_url || body.receiptUrl || body.receipt_url);
  if (receiptImageUrl && typeof receiptImageUrl === 'object' && receiptImageUrl.error) return { error: receiptImageUrl.error };
  const receiptImages = cleanReceiptImages(body.receipt_images || body.receiptImages);

  return {
    id: cleanString(body.id, 64) || `debt-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    debt_id: cleanString(body.debt_id || body.debtId || debtId, 64),
    payment_date: cleanDate(body.payment_date || body.paymentDate || body.date) || new Date().toISOString().slice(0, 10),
    payment_time: cleanTime(body.payment_time || body.paymentTime || body.time),
    amount,
    payment_method: cleanNullable(body.payment_method || body.paymentMethod, 100),
    note: cleanNullable(body.note, 5000),
    receipt_image_url: receiptImageUrl,
    receipt_images: receiptImages,
  };
}

export function normalizePaymentDebtRow(row = {}, payments = []) {
  let parsedImages = [];
  try {
    if (row.receipt_images) parsedImages = JSON.parse(row.receipt_images);
  } catch (e) {
    parsedImages = [];
  }

  return {
    id: row.id,
    customer_name: row.customer_name || '',
    phone: row.phone || '',
    customer_phone: row.phone || '',
    case_reference: row.case_reference || '',
    vehicle_info: row.case_reference || '',
    total_amount: Number(row.total_amount || 0),
    paid_amount: Number(row.paid_amount || 0),
    balance_amount: Number(row.balance_amount || 0),
    status: normalizeDebtStatus(row.status, row.total_amount, row.paid_amount),
    due_date: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
    payment_method: row.payment_method || '',
    description: row.description || '',
    note: row.note || '',
    receipt_image_url: row.receipt_image_url || null,
    receipt_images: parsedImages,
    payments: payments
  };
}

export function normalizeDebtPaymentRow(row = {}) {
  let parsedImages = [];
  try {
    if (row.receipt_images) parsedImages = JSON.parse(row.receipt_images);
  } catch (e) {
    parsedImages = [];
  }
  return {
    id: row.id,
    debt_id: row.debt_id,
    payment_date: row.payment_date ? row.payment_date.toISOString().slice(0, 10) : null,
    payment_time: row.payment_time ? row.payment_time.slice(0, 5) : null,
    amount: Number(row.amount || 0),
    payment_method: row.payment_method || '',
    note: row.note || '',
    receipt_image_url: row.receipt_image_url || null,
    receipt_images: parsedImages,
  };
}

export async function getPaymentDebts(filters = {}) {
  await assertSchemaReady('financial');
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
  await assertSchemaReady('financial');
  const rows = await query('SELECT * FROM payment_debts WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) return null;
  const paymentRows = await query('SELECT * FROM payment_debt_payments WHERE debt_id = ? ORDER BY payment_date DESC, created_at DESC', [id]);
  return normalizePaymentDebtRow(rows[0], paymentRows.map(normalizeDebtPaymentRow));
}

export async function savePaymentDebt(body = {}) {
  await assertSchemaReady('financial');
  const debt = normalizePaymentDebtInput(body);
  if (debt.error) return debt;
  await query(
    `INSERT INTO payment_debts (
      id, customer_name, phone, case_reference, total_amount, paid_amount, balance_amount, status,
      due_date, payment_method, description, note, receipt_image_url, receipt_images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      receipt_image_url = VALUES(receipt_image_url),
      receipt_images = VALUES(receipt_images)`,
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
      debt.receipt_images,
    ]
  );
  return getPaymentDebtById(debt.id);
}

export async function addDebtPayment(debtId, body = {}) {
  await assertSchemaReady('financial');
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
      id, debt_id, payment_date, payment_time, amount, payment_method, note, receipt_image_url, receipt_images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment.id,
      payment.debt_id,
      payment.payment_date,
      payment.payment_time,
      payment.amount,
      payment.payment_method,
      payment.note,
      payment.receipt_image_url,
      payment.receipt_images,
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

export async function recalculatePaymentDebtTotals(debtId) {
  await assertSchemaReady('financial');
  const rows = await query('SELECT total_amount FROM payment_debts WHERE id = ? LIMIT 1', [debtId]);
  if (!rows.length) return { error: 'Payment debt not found' };
  const totalAmount = normalizeMoney(rows[0].total_amount, 0);
  const sumRows = await query(
    'SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM payment_debt_payments WHERE debt_id = ?',
    [debtId]
  );
  const paidAmount = normalizeMoney(sumRows[0]?.paid_amount, 0);
  const balanceAmount = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));
  const status = calculateDebtStatus(totalAmount, paidAmount);

  await query(
    `UPDATE payment_debts
     SET paid_amount = ?, balance_amount = ?, status = ?
     WHERE id = ?`,
    [paidAmount, balanceAmount, status, debtId]
  );

  return getPaymentDebtById(debtId);
}

export async function deleteDebtPaymentById(debtId, paymentId) {
  await assertSchemaReady('financial');
  const rows = await query(
    'SELECT * FROM payment_debt_payments WHERE id = ? AND debt_id = ? LIMIT 1',
    [paymentId, debtId]
  );
  if (!rows.length) return { error: 'Payment not found' };
  const payment = normalizeDebtPaymentRow(rows[0]);

  await query(
    'DELETE FROM payment_debt_payments WHERE id = ? AND debt_id = ?',
    [paymentId, debtId]
  );
  const debt = await recalculatePaymentDebtTotals(debtId);
  if (debt.error) return debt;
  return { payment, debt };
}

export { cleanString };
