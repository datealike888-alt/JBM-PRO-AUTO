
import { requirePermission } from '../../../lib/adminPermissions';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import { query } from '../../../lib/db';
import { assertSchemaReady, handleSchemaError } from '../../../lib/schemaReadiness';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const TYPE_OPTIONS = new Set(['income', 'expense']);
const BASE_YEAR = 2023;

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

function normalizeAmount(value, { optional = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text && optional) return null;
  const amount = Number.parseFloat(text.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(amount) ? amount : null;
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

function normalizeYear(value) {
  const year = cleanString(value, 4);
  if (!/^\d{4}$/.test(year)) return '';
  const numberYear = Number(year);
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 50;
  const normalizedYear = numberYear > 2400 ? numberYear - 543 : numberYear;
  if (normalizedYear < BASE_YEAR || normalizedYear > maxYear) return '';
  return String(normalizedYear);
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

function normalizeRow(row) {
  return {
    id: row.id,
    date: formatSqlDate(row.transaction_date || row.date),
    time: formatSqlTime(row.time),
    type: TYPE_OPTIONS.has(row.type) ? row.type : 'income',
    payment_method: row.payment_method || '',
    description: row.description || '',
    amount: Number(row.amount || 0),
    cost_amount: row.cost_amount === null || row.cost_amount === undefined ? null : Number(row.cost_amount || 0),
    vat_amount: row.vat_amount === null || row.vat_amount === undefined ? null : Number(row.vat_amount || 0),
    before_vat_3_percent: row.before_vat_3_percent === null || row.before_vat_3_percent === undefined ? 0 : Number(row.before_vat_3_percent || 0),
    profit_amount: row.profit_amount === null || row.profit_amount === undefined ? null : Number(row.profit_amount || 0),
    receipt_image_url: row.receipt_image_url || '',
    category: row.category || '',
    note: row.note || '',
    related_vehicle_id: row.related_vehicle_id || '',
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function normalizeBody(body) {
  if (!body || typeof body !== 'object') return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };

  const date = cleanDate(body.date || body.transaction_date);
  if (!date) return { error: 'กรุณาระบุวันที่ทำรายการให้ถูกต้อง' };

  const type = cleanString(body.type, 16);
  if (!TYPE_OPTIONS.has(type)) return { error: 'ประเภทต้องเป็น income หรือ expense เท่านั้น' };

  const paymentMethod = cleanString(body.payment_method, 100);
  if (!paymentMethod) return { error: 'กรุณาระบุช่องทางการเงิน' };

  const description = cleanString(body.description, 5000);
  if (!description) return { error: 'กรุณาระบุรายละเอียด' };

  const amount = normalizeAmount(body.amount);
  const costAmount = normalizeAmount(body.cost_amount ?? body.costAmount, { optional: true });
  const vatAmount = normalizeAmount(body.vat_amount ?? body.vatAmount, { optional: true });
  const beforeVat3Percent = normalizeAmount(body.before_vat_3_percent ?? body.beforeVat3Percent ?? body.withholding_3_percent, { optional: true });
  const profitAmount = normalizeAmount(body.profit_amount ?? body.profitAmount, { optional: true });
  if (amount === null || amount < 0) return { error: 'จำนวนเงินต้องเป็นตัวเลขไม่ติดลบ' };
  if (costAmount !== null && costAmount < 0) return { error: 'cost_amount must be a number greater than or equal to zero' };
  if (vatAmount !== null && vatAmount < 0) return { error: 'vat_amount must be a number greater than or equal to zero' };
  if (beforeVat3Percent !== null && beforeVat3Percent < 0) return { error: 'before_vat_3_percent must be a number greater than or equal to zero' };
  if (profitAmount !== null && profitAmount < 0) return { error: 'กำไรต้องเป็นตัวเลขไม่ติดลบ' };

  const id = cleanString(body.id, 64) || `fin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const receiptImageUrl = cleanReceiptUrl(body.receipt_image_url || body.receiptUrl || body.receipt_url);
  if (receiptImageUrl && typeof receiptImageUrl === 'object' && receiptImageUrl.error) return { error: receiptImageUrl.error };

  return {
    transaction: {
      id,
      date,
      time: cleanTime(body.time),
      type,
      category: cleanString(body.category, 100) || null,
      payment_method: paymentMethod,
      description,
      amount,
      cost_amount: costAmount,
      vat_amount: vatAmount,
      before_vat_3_percent: beforeVat3Percent ?? 0,
      profit_amount: profitAmount,
      receipt_image_url: receiptImageUrl,
      related_vehicle_id: cleanString(body.related_vehicle_id || body.relatedVehicleId, 64) || null,
      note: cleanString(body.note, 5000) || null,
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
    where.push('(LOWER(description) LIKE ? OR LOWER(payment_method) LIKE ? OR LOWER(category) LIKE ?)');
    const like = `%${search.toLowerCase()}%`;
    params.push(like, like, like);
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
    where.push('YEAR(transaction_date) = ?');
    params.push(year);
  }
  if (/^\d{2}$/.test(month)) {
    where.push('MONTH(transaction_date) = ?');
    params.push(month);
  }
  if (/^\d{2}$/.test(day)) {
    where.push('DAY(transaction_date) = ?');
    params.push(day);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function GET(request) {
  try {
    const authResult = await requirePermission(request, 'finance.view');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    await assertSchemaReady('financial');

    const url = new URL(request.url);
    const where = buildWhere(url);
    const rows = await query(
      `SELECT * FROM financial_transactions
       ${where.clause}
       ORDER BY transaction_date DESC, COALESCE(time, '23:59:59') DESC, created_at DESC
       LIMIT 2000`,
      where.params
    );

    return json({ success: true, transactions: rows.map(normalizeRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[financial-transactions] GET failed', error);
    return json({ error: 'ระบบการเงินยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requirePermission(request, 'finance.create');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
    }

    const normalized = normalizeBody(body);
    if (normalized.error) return json({ error: normalized.error }, { status: 400 });
    const { transaction } = normalized;

    await assertSchemaReady('financial');
    const beforeRows = await query('SELECT * FROM financial_transactions WHERE id = ? LIMIT 1', [transaction.id]);
    const beforeTransaction = Array.isArray(beforeRows) && beforeRows.length ? normalizeRow(beforeRows[0]) : null;
    await query(
      `INSERT INTO financial_transactions (
        id, date, time, transaction_date, type, category, description, amount, cost_amount, vat_amount, before_vat_3_percent, profit_amount, payment_method, receipt_image_url, related_vehicle_id, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        date = VALUES(date),
        time = VALUES(time),
        transaction_date = VALUES(transaction_date),
        type = VALUES(type),
        category = VALUES(category),
        description = VALUES(description),
        amount = VALUES(amount),
        cost_amount = VALUES(cost_amount),
        vat_amount = VALUES(vat_amount),
        before_vat_3_percent = VALUES(before_vat_3_percent),
        profit_amount = VALUES(profit_amount),
        payment_method = VALUES(payment_method),
        receipt_image_url = VALUES(receipt_image_url),
        related_vehicle_id = VALUES(related_vehicle_id),
        note = VALUES(note)`,
      [
        transaction.id,
        transaction.date,
        transaction.time,
        transaction.date,
        transaction.type,
        transaction.category,
        transaction.description,
        transaction.amount,
        transaction.cost_amount,
        transaction.vat_amount,
        transaction.before_vat_3_percent,
        transaction.profit_amount,
        transaction.payment_method,
        transaction.receipt_image_url,
        transaction.related_vehicle_id,
        transaction.note,
      ]
    );

    const savedRows = await query('SELECT * FROM financial_transactions WHERE id = ? LIMIT 1', [transaction.id]);
    const savedTransaction = normalizeRow(savedRows[0] || transaction);
    await insertAuditLogSafe({
      action: beforeTransaction ? 'UPDATE' : 'CREATE',
      module: 'FINANCIAL',
      entityType: 'FINANCIAL_TRANSACTION',
      entityId: savedTransaction.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: savedTransaction.description || savedTransaction.id,
        beforeData: beforeTransaction,
        afterData: savedTransaction,
      },
    });

    return json({ success: true, transaction: savedTransaction }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[financial-transactions] POST failed', error);
    return json({ error: 'บันทึกรายการการเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'finance.delete');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'กรุณาระบุ id ของรายการที่ต้องการลบ' }, { status: 400 });

    await assertSchemaReady('financial');
    const rows = await query('SELECT * FROM financial_transactions WHERE id = ? LIMIT 1', [id]);
    const previousTransaction = Array.isArray(rows) && rows.length ? normalizeRow(rows[0]) : null;
    await query('DELETE FROM financial_transactions WHERE id = ?', [id]);
    if (previousTransaction) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'FINANCIAL',
        entityType: 'FINANCIAL_TRANSACTION',
        entityId: previousTransaction.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: previousTransaction.description || previousTransaction.id,
          beforeData: previousTransaction,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[financial-transactions] DELETE failed', error);
    return json({ error: 'ลบรายการการเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}
