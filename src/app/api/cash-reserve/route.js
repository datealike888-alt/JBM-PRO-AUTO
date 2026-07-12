
import { requirePermission } from '../../../lib/adminPermissions';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import { query } from '../../../lib/db';
import { recalculateBalances } from '../../../lib/cashReserveStorage';
import { assertSchemaReady, handleSchemaError } from '../../../lib/schemaReadiness';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
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

const toMoneyNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? Number(value.replace(/,/g, '').replace(/[^0-9.-]/g, '')) : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};

const toCents = (value) => Math.round(toMoneyNumber(value) * 100);
const fromCents = (value) => Math.round(value) / 100;

function normalizeAmount(value) {
  return toMoneyNumber(value);
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
    transaction_date: formatSqlDate(row.transaction_date),
    transaction_time: formatSqlTime(row.transaction_time),
    type: row.type || '',
    detail: row.detail || '',
    vehicle_ref: row.vehicle_ref || '',
    case_ref: row.case_ref || '',
    person_name: row.person_name || '',
    payment_channel: row.payment_channel || '',
    amount: Number(row.amount || 0),
    direction: row.direction || '',
    balance_after: Number(row.balance_after || 0),
    receipt_image_url: row.receipt_image_url || '',
    note: row.note || '',
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function buildWhere(url) {
  const where = [];
  const params = [];
  const search = cleanString(url.searchParams.get('search'), 100);
  const type = cleanString(url.searchParams.get('type'), 50);
  const day = cleanString(url.searchParams.get('day'), 2);
  const month = cleanString(url.searchParams.get('month'), 2);
  const year = normalizeYear(url.searchParams.get('year'));

  if (search) {
    where.push('(LOWER(detail) LIKE ? OR LOWER(vehicle_ref) LIKE ? OR LOWER(case_ref) LIKE ? OR LOWER(note) LIKE ?)');
    const like = `%${search.toLowerCase()}%`;
    params.push(like, like, like, like);
  }
  if (type && type !== 'all') {
    where.push('type = ?');
    params.push(type);
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
    const authResult = await requirePermission(request, 'cashReserve.view');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });

    await assertSchemaReady('financial');

    const url = new URL(request.url);
    const where = buildWhere(url);
    const rows = await query(
      `SELECT * FROM cash_reserve_transactions
       ${where.clause}
       ORDER BY transaction_date DESC, COALESCE(transaction_time, '23:59:59') DESC, created_at DESC
       LIMIT 2000`,
      where.params
    );

    await recalculateBalances();
    
    const allRows = await query(`SELECT type, amount, direction FROM cash_reserve_transactions`);
    let calcTotalInCents = 0;
    let calcTotalOutCents = 0;
    let calcTotalReturnedCents = 0;
    let calcTotalTransferredOutCents = 0;
    let calcTotalAdjustCents = 0;
    let calcBalanceCents = 0;

    for (const r of allRows) {
      const amtCents = toCents(r.amount);
      if (r.direction === 'IN') {
        calcBalanceCents += amtCents;
        if (r.type === 'คืนเงินเข้ากอง') {
          calcTotalReturnedCents += amtCents;
        } else {
          calcTotalInCents += amtCents;
        }
      } else if (r.direction === 'OUT') {
        calcBalanceCents -= amtCents;
        if (r.type === 'โอนออกจากกอง / คืนบัญชีหลัก') {
          calcTotalTransferredOutCents += amtCents;
        } else {
          calcTotalOutCents += amtCents;
        }
      } else if (r.direction === 'ADJUST') {
        calcBalanceCents += amtCents;
        calcTotalAdjustCents += amtCents;
      }
    }

    return json({ 
      success: true, 
      transactions: rows.map(normalizeRow),
      summary: {
        balance: fromCents(calcBalanceCents),
        totalIn: fromCents(calcTotalInCents),
        totalOut: fromCents(calcTotalOutCents),
        totalReturned: fromCents(calcTotalReturnedCents),
        totalTransferredOut: fromCents(calcTotalTransferredOutCents),
        totalAdjust: fromCents(calcTotalAdjustCents),
      }
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[cash-reserve] GET failed', error);
    return json({ error: 'ไม่สามารถดึงข้อมูลเงินสำรองจ่ายได้' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requirePermission(request, 'cashReserve.create');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    await assertSchemaReady('financial');

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
    }

    const transactionDate = cleanDate(body.transaction_date) || new Date().toISOString().slice(0, 10);

    const type = cleanString(body.type, 50) || 'จ่ายจากเงินสำรอง';
    const detail = cleanString(body.detail, 5000) || '-';

    const amount = normalizeAmount(body.amount);
    
    let direction = cleanString(body.direction, 20) || 'IN';
    if (type === 'ตั้งยอดเริ่มต้น' || type === 'เติมเงินสำรอง' || type === 'คืนเงินเข้ากอง') direction = 'IN';
    else if (type === 'จ่ายจากเงินสำรอง' || type === 'โอนออกจากกอง / คืนบัญชีหลัก') direction = 'OUT';
    else if (type === 'ปรับยอด') direction = 'ADJUST';

    if (direction !== 'ADJUST' && amount < 0) {
      return json({ error: 'จำนวนเงินไม่สามารถติดลบได้' }, { status: 400 });
    }

    const id = cleanString(body.id, 64) || `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (direction === 'OUT' && amount > 0) {
      const summary = await recalculateBalances();
      if (amount > summary.balance) {
        return json({ error: 'ยอดเงินสำรองไม่เพียงพอ' }, { status: 400 });
      }
    }

    const beforeRows = await query('SELECT * FROM cash_reserve_transactions WHERE id = ? LIMIT 1', [id]);
    const beforeTransaction = Array.isArray(beforeRows) && beforeRows.length ? normalizeRow(beforeRows[0]) : null;

    await query(
      `INSERT INTO cash_reserve_transactions (
        id, transaction_date, transaction_time, type, detail, vehicle_ref, case_ref, person_name, payment_channel, amount, direction, receipt_image_url, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        transaction_date = VALUES(transaction_date),
        transaction_time = VALUES(transaction_time),
        type = VALUES(type),
        detail = VALUES(detail),
        vehicle_ref = VALUES(vehicle_ref),
        case_ref = VALUES(case_ref),
        person_name = VALUES(person_name),
        payment_channel = VALUES(payment_channel),
        amount = VALUES(amount),
        direction = VALUES(direction),
        receipt_image_url = VALUES(receipt_image_url),
        note = VALUES(note)`,
      [
        id,
        transactionDate,
        cleanTime(body.transaction_time),
        type,
        detail,
        cleanString(body.vehicle_ref, 255) || null,
        cleanString(body.case_ref, 255) || null,
        cleanString(body.person_name, 255) || null,
        cleanString(body.payment_channel, 100) || null,
        amount,
        direction,
        cleanString(body.receipt_image_url, 1000) || null,
        cleanString(body.note, 5000) || null,
      ]
    );

    await recalculateBalances();

    const savedRows = await query('SELECT * FROM cash_reserve_transactions WHERE id = ? LIMIT 1', [id]);
    const savedTransaction = normalizeRow(savedRows[0]);
    
    await insertAuditLogSafe({
      action: beforeTransaction ? 'UPDATE' : 'CREATE',
      module: 'CASH_RESERVE',
      entityType: 'CASH_RESERVE_TRANSACTION',
      entityId: savedTransaction.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: savedTransaction.detail || savedTransaction.id,
        beforeData: beforeTransaction,
        afterData: savedTransaction,
      },
    });

    return json({ success: true, transaction: savedTransaction }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[cash-reserve] POST failed', error);
    return json({ error: 'ไม่สามารถบันทึกรายการเงินสำรองจ่ายได้' }, { status: 503 });
  }
}
