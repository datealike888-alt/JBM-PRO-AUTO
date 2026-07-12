import { query } from './db';
import { assertSchemaReady } from './schemaReadiness';

export const SUPPLIER_STATUS_PENDING = 'รอจ่าย';
export const SUPPLIER_STATUS_PAID = 'จ่ายแล้ว';
export const SUPPLIER_STATUS_VALUES = new Set([SUPPLIER_STATUS_PENDING, SUPPLIER_STATUS_PAID]);

export function cleanString(value, maxLength = 255) {
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

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function cleanSlipUrl(value) {
  const text = cleanString(value, 500);
  if (!text) return null;
  if (text.startsWith('data:')) return { error: 'กรุณาอัปโหลดรูปสลิปก่อนบันทึก' };
  if (/^\/uploads\/receipts\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(text)) return text;
  if (/^\/api\/receipts\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? text : { error: 'รูปสลิปไม่ถูกต้อง' };
  } catch {
    return { error: 'รูปสลิปไม่ถูกต้อง' };
  }
}



export function normalizeSupplierPayableInput(body = {}, admin = null) {
  const status = cleanString(body.status, 32) || SUPPLIER_STATUS_PENDING;
  if (!SUPPLIER_STATUS_VALUES.has(status)) return { error: 'สถานะต้องเป็นรอจ่ายหรือจ่ายแล้วเท่านั้น' };

  const slipUrl = cleanSlipUrl(body.slip_url || body.slipUrl || body.slip_path || body.slipPath);
  if (slipUrl && typeof slipUrl === 'object' && slipUrl.error) return { error: slipUrl.error };

  const transactionDate = cleanDate(body.transaction_date || body.transactionDate || body.date);
  const companyName = cleanString(body.company_name || body.companyName, 255);
  const outstandingAmount = normalizeMoney(body.outstanding_amount ?? body.outstandingAmount, -1);
  if (!transactionDate) return { error: 'กรุณาระบุวันที่รายการให้ถูกต้อง' };
  if (!companyName) return { error: 'กรุณาระบุชื่อบริษัท' };
  if (outstandingAmount < 0) return { error: 'ยอดค้างจ่ายต้องเป็นตัวเลขไม่ติดลบ' };

  return {
    id: cleanString(body.id, 64) || `supplier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    transaction_date: transactionDate,
    company_name: companyName,
    outstanding_amount: outstandingAmount,
    status,
    paid_date: status === SUPPLIER_STATUS_PAID ? cleanDate(body.paid_date || body.paidDate) : null,
    slip_url: slipUrl,
    note: cleanNullable(body.note, 5000),
    created_by: cleanNullable(body.created_by || body.createdBy || admin?.displayName || admin?.username, 255),
  };
}

export function normalizeSupplierPayableRow(row = {}) {
  return {
    id: row.id,
    transaction_date: formatSqlDate(row.transaction_date),
    company_name: row.company_name || '',
    outstanding_amount: Number(row.outstanding_amount || 0),
    status: SUPPLIER_STATUS_VALUES.has(row.status) ? row.status : SUPPLIER_STATUS_PENDING,
    paid_date: formatSqlDate(row.paid_date),
    slip_url: row.slip_url || '',
    note: row.note || '',
    created_by: row.created_by || '',
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export async function getSupplierPayables(filters = {}) {
  await assertSchemaReady('financial');
  const where = [];
  const params = [];
  const search = cleanString(filters.search, 100).toLowerCase();
  const status = cleanString(filters.status, 32);

  if (search) {
    const like = `%${search}%`;
    where.push('(LOWER(company_name) LIKE ? OR LOWER(COALESCE(note, \'\')) LIKE ?)');
    params.push(like, like);
  }
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }

  const rows = await query(
    `SELECT * FROM supplier_payables
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY updated_at DESC, created_at DESC, transaction_date DESC
     LIMIT 2000`,
    params
  );
  return (Array.isArray(rows) ? rows : []).map(normalizeSupplierPayableRow);
}

export async function getSupplierPayableById(id) {
  await assertSchemaReady('financial');
  const rows = await query('SELECT * FROM supplier_payables WHERE id = ? LIMIT 1', [cleanString(id, 64)]);
  return Array.isArray(rows) && rows.length ? normalizeSupplierPayableRow(rows[0]) : null;
}

export async function saveSupplierPayable(body = {}, admin = null) {
  await assertSchemaReady('financial');
  const payable = normalizeSupplierPayableInput(body, admin);
  if (payable.error) return payable;

  await query(
    `INSERT INTO supplier_payables (
      id, transaction_date, company_name, outstanding_amount, status, paid_date, slip_url, note, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      transaction_date = VALUES(transaction_date),
      company_name = VALUES(company_name),
      outstanding_amount = VALUES(outstanding_amount),
      status = VALUES(status),
      paid_date = VALUES(paid_date),
      slip_url = VALUES(slip_url),
      note = VALUES(note),
      created_by = COALESCE(created_by, VALUES(created_by))`,
    [
      payable.id,
      payable.transaction_date,
      payable.company_name,
      payable.outstanding_amount,
      payable.status,
      payable.paid_date,
      payable.slip_url,
      payable.note,
      payable.created_by,
    ]
  );

  return getSupplierPayableById(payable.id);
}

export async function deleteSupplierPayable(id) {
  await assertSchemaReady('financial');
  const payable = await getSupplierPayableById(id);
  if (!payable) return { error: 'ไม่พบรายการซัพพลายเออร์' };
  await query('DELETE FROM supplier_payables WHERE id = ?', [cleanString(id, 64)]);
  return payable;
}
