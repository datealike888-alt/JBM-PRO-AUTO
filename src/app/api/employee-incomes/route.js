import {
  buildYearMonthDayFilters,
  cleanString,
  ensureEmployeeIncomesTable,
  normalizeEmployeeIncomeInput,
  normalizeEmployeeIncomeRow,
  query,
} from '../../../lib/employeeStorage';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import { requireAnyPermission } from '../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const TYPE_OPTIONS = new Set(['โอที', 'ค่าคอมมิชชั่น', 'โบนัส', 'เบี้ยขยัน', 'อื่น ๆ']);
const STATUS_OPTIONS = new Set(['รอบันทึก', 'บันทึกแล้ว', 'จ่ายแล้ว', 'ยกเลิก']);
const CUSTOM_OVERTIME_RATE = 'กำหนดเอง';

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function parseOptionalNumber(value) {
  if (!hasValue(value)) return { value: null };
  const number = Number.parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(number)) return { error: 'รูปแบบตัวเลขไม่ถูกต้อง' };
  return { value: number };
}

function normalizeTime(value) {
  const text = cleanString(value, 8);
  if (!text) return { value: null };
  if (/^\d{2}:\d{2}$/.test(text)) return { value: `${text}:00` };
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return { value: text };
  return { error: 'รูปแบบเวลาต้องเป็น HH:mm' };
}

function getBodyValue(body, camelKey, snakeKey = camelKey) {
  return body[camelKey] ?? body[snakeKey];
}

function validateIncomeBody(body = {}) {
  const income = normalizeEmployeeIncomeInput(body);
  const errors = [];

  if (!income.employeeId) errors.push('กรุณาเลือกพนักงาน');
  if (!TYPE_OPTIONS.has(income.type)) errors.push('กรุณาเลือกประเภทที่รองรับ');
  if (!income.workDate) errors.push('กรุณาระบุวันที่');
  if (income.amount === null || income.amount <= 0) errors.push('จำนวนเงินต้องเป็นตัวเลขมากกว่า 0');
  if (!STATUS_OPTIONS.has(income.status)) errors.push('กรุณาเลือกสถานะที่รองรับ');
  if (income.type === 'อื่น ๆ' && !income.customType) errors.push('กรุณาระบุประเภทเอง');

  const overtimeStartRaw = getBodyValue(body, 'overtimeStart', 'overtime_start_time');
  const overtimeEndRaw = getBodyValue(body, 'overtimeEnd', 'overtime_end_time');
  const overtimeStart = normalizeTime(overtimeStartRaw);
  const overtimeEnd = normalizeTime(overtimeEndRaw);
  if (hasValue(overtimeStartRaw) && overtimeStart.error) errors.push('เวลาเริ่มโอทีไม่ถูกต้อง');
  if (hasValue(overtimeEndRaw) && overtimeEnd.error) errors.push('เวลาจบโอทีไม่ถูกต้อง');
  income.overtimeStart = overtimeStart.value;
  income.overtimeEnd = overtimeEnd.value;

  const optionalNumbers = [
    ['overtimeHours', 'overtime_hours', 'จำนวนชั่วโมงโอที'],
    ['overtimeRate', 'overtime_rate', 'อัตราโอที'],
    ['hourlyWage', 'hourly_wage', 'ค่าแรงต่อชั่วโมง'],
    ['commissionBase', 'commission_base', 'ฐานคำนวณค่าคอม'],
    ['commissionPercent', 'commission_percent', 'เปอร์เซ็นต์ค่าคอม'],
  ];

  for (const [camelKey, snakeKey, label] of optionalNumbers) {
    const raw = getBodyValue(body, camelKey, snakeKey);
    const parsed = parseOptionalNumber(raw);
    if (parsed.error) errors.push(`${label}ต้องเป็นตัวเลขทศนิยมได้`);
    if (parsed.value !== null && parsed.value < 0) errors.push(`${label}ต้องไม่ติดลบ`);
    income[camelKey] = parsed.value;
  }

  const hasOvertimeData = [
    overtimeStartRaw,
    overtimeEndRaw,
    getBodyValue(body, 'overtimeHours', 'overtime_hours'),
    getBodyValue(body, 'overtimeRate', 'overtime_rate'),
    getBodyValue(body, 'hourlyWage', 'hourly_wage'),
    getBodyValue(body, 'overtimeReason', 'overtime_reason'),
  ].some(hasValue);

  if (income.overtimeRateType === CUSTOM_OVERTIME_RATE && hasOvertimeData && !(income.overtimeRate > 0)) {
    errors.push('อัตราโอทีแบบกำหนดเองต้องมากกว่า 0');
  }

  return { income, errors };
}

function buildWhere(url) {
  const where = [];
  const params = [];
  const employeeId = cleanString(url.searchParams.get('employeeId'), 64);
  const type = cleanString(url.searchParams.get('type'), 100);
  const status = cleanString(url.searchParams.get('status'), 50);
  const dateFilters = buildYearMonthDayFilters(url, 'ei.work_date');

  if (employeeId) {
    where.push('ei.employee_id = ?');
    params.push(employeeId);
  }
  if (TYPE_OPTIONS.has(type)) {
    where.push('ei.type = ?');
    params.push(type);
  }
  if (STATUS_OPTIONS.has(status)) {
    where.push('ei.status = ?');
    params.push(status);
  }

  where.push(...dateFilters.where);
  params.push(...dateFilters.params);

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

const SELECT_SQL = `
  SELECT ei.*, e.employee_code
  FROM employee_incomes ei
  LEFT JOIN employees e ON e.id = ei.employee_id
`;

export async function GET(request) {
  try {
    await ensureEmployeeIncomesTable();
    const authResult = await requireAnyPermission(request, ['employees.view', 'finance.view']);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });

    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `${SELECT_SQL}
       ${where.clause}
       ORDER BY ei.work_date DESC, ei.created_at DESC
       LIMIT 5000`,
      where.params
    );

    return json({ success: true, incomes: rows.map(normalizeEmployeeIncomeRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[employee-incomes] GET failed', error);
    return json({ error: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requireAnyPermission(request, ['employees.create', 'employees.update', 'finance.create', 'finance.update']);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { income, errors } = validateIncomeBody(body);
    if (errors.length > 0) return json({ error: errors[0], errors }, { status: 400 });

    await ensureEmployeeIncomesTable();
    const beforeRows = await query(`${SELECT_SQL} WHERE ei.id = ? LIMIT 1`, [income.id]);
    const previousIncome = Array.isArray(beforeRows) && beforeRows.length ? normalizeEmployeeIncomeRow(beforeRows[0]) : null;

    await query(
      `INSERT INTO employee_incomes (
        id, employee_id, type, custom_type, work_date, title, detail, note, amount, status,
        overtime_start_time, overtime_end_time, overtime_hours, overtime_rate_type, overtime_rate, hourly_wage,
        overtime_reason, repair_reference, license_plate, customer_name, commission_base, commission_percent,
        calculation_note, source_type, source_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        type = VALUES(type),
        custom_type = VALUES(custom_type),
        work_date = VALUES(work_date),
        title = VALUES(title),
        detail = VALUES(detail),
        note = VALUES(note),
        amount = VALUES(amount),
        status = VALUES(status),
        overtime_start_time = VALUES(overtime_start_time),
        overtime_end_time = VALUES(overtime_end_time),
        overtime_hours = VALUES(overtime_hours),
        overtime_rate_type = VALUES(overtime_rate_type),
        overtime_rate = VALUES(overtime_rate),
        hourly_wage = VALUES(hourly_wage),
        overtime_reason = VALUES(overtime_reason),
        repair_reference = VALUES(repair_reference),
        license_plate = VALUES(license_plate),
        customer_name = VALUES(customer_name),
        commission_base = VALUES(commission_base),
        commission_percent = VALUES(commission_percent),
        calculation_note = VALUES(calculation_note),
        source_type = VALUES(source_type),
        source_id = VALUES(source_id)`,
      [
        income.id,
        income.employeeId,
        income.type,
        income.customType,
        income.workDate,
        income.title,
        income.detail,
        income.note,
        income.amount,
        income.status,
        income.overtimeStart,
        income.overtimeEnd,
        income.overtimeHours,
        income.overtimeRateType,
        income.overtimeRate,
        income.hourlyWage,
        income.overtimeReason,
        income.repairReference,
        income.licensePlate,
        income.customerName,
        income.commissionBase,
        income.commissionPercent,
        income.calculationNote,
        income.sourceType,
        income.sourceId,
        income.createdAt,
      ]
    );

    const rows = await query(`${SELECT_SQL} WHERE ei.id = ? LIMIT 1`, [income.id]);
    const savedIncome = normalizeEmployeeIncomeRow(rows[0] || income);
    await insertAuditLogSafe({
      action: previousIncome ? 'UPDATE' : 'CREATE',
      module: 'EMPLOYEE_INCOME',
      entityType: 'EMPLOYEE_INCOME',
      entityId: savedIncome.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: `${savedIncome.employeeCode || savedIncome.employeeId} ${savedIncome.type} ${savedIncome.amount}`.trim(),
        beforeData: previousIncome,
        afterData: savedIncome,
      },
    });

    return json({ success: true, income: savedIncome }, { status: 200 });
  } catch (error) {
    console.error('[employee-incomes] POST failed', error);
    return json({ error: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่' }, { status: 503 });
  }
}

export async function PUT(request) {
  return POST(request);
}

export async function PATCH(request) {
  return POST(request);
}

export async function DELETE(request) {
  try {
    const authResult = await requireAnyPermission(request, ['employees.update', 'employees.delete', 'finance.delete']);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });

    await ensureEmployeeIncomesTable();
    const rows = await query(`${SELECT_SQL} WHERE ei.id = ? LIMIT 1`, [id]);
    const previousIncome = Array.isArray(rows) && rows.length ? normalizeEmployeeIncomeRow(rows[0]) : null;
    await query('DELETE FROM employee_incomes WHERE id = ?', [id]);
    if (previousIncome) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'EMPLOYEE_INCOME',
        entityType: 'EMPLOYEE_INCOME',
        entityId: previousIncome.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: `${previousIncome.employeeCode || previousIncome.employeeId} ${previousIncome.type}`.trim(),
          beforeData: previousIncome,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[employee-incomes] DELETE failed', error);
    return json({ error: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่' }, { status: 503 });
  }
}
