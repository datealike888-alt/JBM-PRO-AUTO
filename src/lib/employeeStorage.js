import { isAuthorizedAdminRequest } from './adminAuth';
import { query } from './db';

const DEFAULT_ATTENDANCE_SETTINGS = {
  morningStart: '09:00',
  morningLateAfter: '09:06',
  lunchOut: '12:30',
  afternoonStart: '13:30',
  afternoonLateAfter: '13:31',
  workEnd: '18:00',
};

const DEFAULT_POSITIONS = [
  ['position-owner', 'เจ้าของอู่', 1],
  ['position-manager', 'ผู้จัดการ', 2],
  ['position-accounting', 'พนักงานบัญชี', 3],
  ['position-stock', 'พนักงานสต๊อก', 4],
  ['position-mechanic', 'ช่าง', 5],
];

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanNullable(value, maxLength = 255) {
  const text = cleanString(value, maxLength);
  return text || null;
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

function cleanDateTime(value) {
  const text = cleanString(value, 32);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanPhotoUrl(value) {
  const text = cleanString(value, 500);
  if (!text || text.startsWith('data:')) return null;
  if (/^\/uploads\/employees\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? text : null;
  } catch {
    return null;
  }
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  const text = cleanString(value, 16).toLowerCase();
  if (!text) return fallback;
  return ['1', 'true', 'yes', 'active', 'enabled'].includes(text);
}

function normalizeNumber(value, fallback = 0) {
  const number = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : fallback;
}

function normalizeOptionalNumber(value) {
  const text = cleanString(value, 64).replace(/,/g, '');
  if (!text) return null;
  const number = Number.parseFloat(text);
  return Number.isFinite(number) ? number : null;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeAttendanceStatus(value) {
  const status = cleanString(value, 100);
  const lowerStatus = status.toLowerCase();
  const mappedStatus = {
    present: 'มาทำงาน',
    late: 'สาย',
    leave: 'ลา',
    absent: 'ขาดงาน',
  }[lowerStatus];
  return mappedStatus || status || null;
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


export async function isAuthorizedToken(request) {
  return isAuthorizedAdminRequest(request);
}

export function normalizeEmployeeRow(row) {
  let status = row.status || 'ทำงานอยู่';
  if (['ลา', 'สาย', 'ขาดงาน', 'ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'มาทำงาน', 'สายเช้า', 'สายบ่าย', 'สายเช้า+บ่าย'].includes(status)) {
    status = 'ทำงานอยู่';
  }
  return {
    id: row.id,
    code: row.employee_code || '',
    status: status,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    nickname: row.nickname || '',
    position: row.position || '',
    phone: row.phone || '',
    photo_url: row.photo_url || '',
    photoUrl: row.photo_url || '',
    startDate: formatSqlDate(row.start_date),
    note: row.note || '',
    active: row.status !== 'ลาออก',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function normalizeEmployeeInput(body = {}) {
  let status = cleanString(body.status, 50) || 'ทำงานอยู่';
  if (['ลา', 'สาย', 'ขาดงาน', 'ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'มาทำงาน', 'สายเช้า', 'สายบ่าย', 'สายเช้า+บ่าย'].includes(status)) {
    status = 'ทำงานอยู่';
  }
  const firstName = cleanString(body.firstName, 255);
  const lastName = cleanString(body.lastName, 255);

  return {
    id: cleanString(body.id, 64) || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeCode: cleanString(body.code || body.employeeCode, 100),
    firstName,
    lastName,
    nickname: cleanString(body.nickname, 100),
    position: cleanString(body.position, 100),
    phone: cleanNullable(body.phone, 50),
    photoUrl: cleanPhotoUrl(body.photo_url || body.photoUrl),
    status,
    startDate: cleanDate(body.startDate),
    note: cleanNullable(body.note, 5000),
    createdAt: cleanDateTime(body.createdAt),
  };
}

export function normalizeEmployeePositionRow(row) {
  return {
    id: row.id,
    name: row.name || '',
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function normalizeEmployeePositionInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `position-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanString(body.name, 255),
    sortOrder: Math.max(0, Math.trunc(normalizeNumber(body.sortOrder, 0))),
    active: normalizeBoolean(body.active, true),
  };
}

export function normalizeAttendanceLogRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code || '',
    date: formatSqlDate(row.work_date),
    morningIn: formatSqlTime(row.check_in_time),
    lunchOut: formatSqlTime(row.lunch_out_time),
    afternoonIn: formatSqlTime(row.lunch_in_time),
    eveningOut: formatSqlTime(row.check_out_time),
    method: row.method || 'auto',
    status: row.status || '',
    hours: Number(row.total_hours || 0),
    otHours: Number(row.ot_hours || 0),
    note: row.note || '',
    source: row.source || 'api',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function normalizeAttendanceLogInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: cleanString(body.employeeId, 64),
    employeeCode: cleanNullable(body.employeeCode, 100),
    date: cleanDate(body.date),
    morningIn: cleanTime(body.morningIn),
    lunchOut: cleanTime(body.lunchOut),
    afternoonIn: cleanTime(body.afternoonIn),
    eveningOut: cleanTime(body.eveningOut),
    method: cleanString(body.method, 100) || 'auto',
    status: normalizeAttendanceStatus(body.status),
    hours: Math.max(0, normalizeNumber(body.hours, 0)),
    otHours: Math.max(0, normalizeNumber(body.otHours, 0)),
    note: cleanNullable(body.note, 5000),
    source: cleanString(body.source, 32) || 'api',
    createdAt: cleanDateTime(body.createdAt),
  };
}

export function normalizeLeaveLogRow(row) {
  const leaveDurationType = cleanString(row.leave_duration_type || row.leaveDurationType || row.durationType, 50) || 'full_day';
  const leaveDays = normalizeNumber(row.leave_days ?? row.leaveDays ?? 1, 1);
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code || '',
    type: row.leave_type || '',
    startDate: formatSqlDate(row.start_date),
    endDate: formatSqlDate(row.end_date),
    durationType: leaveDurationType,
    leaveDurationType,
    leave_duration_type: leaveDurationType,
    leaveDays,
    leave_days: leaveDays,
    totalDays: leaveDays,
    approver: row.approver || '',
    reason: row.reason || '',
    status: row.status || 'รออนุมัติ',
    submittedAt: formatSqlDate(row.created_at),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function normalizeLeaveLogInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: cleanString(body.employeeId, 64),
    employeeCode: cleanNullable(body.employeeCode, 100),
    type: cleanString(body.type || body.leaveType, 100),
    startDate: cleanDate(body.startDate),
    endDate: cleanDate(body.endDate),
    totalDays: Math.max(0, normalizeNumber(body.totalDays, 0)),
    durationType: cleanString(body.durationType || body.leaveDurationType || body.leave_duration_type, 50) || 'full_day',
    leaveDays: Math.max(0, normalizeNumber(body.leaveDays ?? body.leave_days ?? body.totalDays, 1)),
    approver: cleanNullable(body.approver, 255),
    reason: cleanNullable(body.reason, 5000),
    status: cleanString(body.status, 50) || 'รออนุมัติ',
    createdAt: cleanDateTime(body.createdAt),
  };
}

export function normalizeEmployeeIncomeRow(row) {
  const workDate = formatSqlDate(row.work_date);
  const overtimeStart = formatSqlTime(row.overtime_start_time);
  const overtimeEnd = formatSqlTime(row.overtime_end_time);
  return {
    id: row.id,
    employeeId: row.employee_id,
    employee_id: row.employee_id,
    employeeCode: row.employee_code || '',
    type: row.type || '',
    customType: row.custom_type || '',
    custom_type: row.custom_type || '',
    workDate,
    work_date: workDate,
    title: row.title || '',
    detail: row.detail || '',
    note: row.note || '',
    amount: Number(row.amount || 0),
    status: row.status || '',
    overtimeStart,
    overtime_start_time: overtimeStart,
    overtimeEnd,
    overtime_end_time: overtimeEnd,
    overtimeHours: row.overtime_hours === null || row.overtime_hours === undefined ? null : Number(row.overtime_hours),
    overtime_hours: row.overtime_hours === null || row.overtime_hours === undefined ? null : Number(row.overtime_hours),
    overtimeRateType: row.overtime_rate_type || '',
    overtime_rate_type: row.overtime_rate_type || '',
    overtimeRate: row.overtime_rate === null || row.overtime_rate === undefined ? null : Number(row.overtime_rate),
    overtime_rate: row.overtime_rate === null || row.overtime_rate === undefined ? null : Number(row.overtime_rate),
    hourlyWage: row.hourly_wage === null || row.hourly_wage === undefined ? null : Number(row.hourly_wage),
    hourly_wage: row.hourly_wage === null || row.hourly_wage === undefined ? null : Number(row.hourly_wage),
    overtimeReason: row.overtime_reason || '',
    overtime_reason: row.overtime_reason || '',
    repairReference: row.repair_reference || '',
    repair_reference: row.repair_reference || '',
    licensePlate: row.license_plate || '',
    license_plate: row.license_plate || '',
    customerName: row.customer_name || '',
    customer_name: row.customer_name || '',
    commissionBase: row.commission_base === null || row.commission_base === undefined ? null : Number(row.commission_base),
    commission_base: row.commission_base === null || row.commission_base === undefined ? null : Number(row.commission_base),
    commissionPercent: row.commission_percent === null || row.commission_percent === undefined ? null : Number(row.commission_percent),
    commission_percent: row.commission_percent === null || row.commission_percent === undefined ? null : Number(row.commission_percent),
    calculationNote: row.calculation_note || '',
    calculation_note: row.calculation_note || '',
    sourceType: row.source_type || '',
    source_type: row.source_type || '',
    sourceId: row.source_id || '',
    source_id: row.source_id || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function normalizeEmployeeIncomeInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: cleanString(body.employeeId || body.employee_id, 64),
    type: cleanString(body.type, 100),
    customType: cleanNullable(body.customType || body.custom_type, 100),
    workDate: cleanDate(body.workDate || body.work_date || body.date),
    title: cleanNullable(body.title, 255),
    detail: cleanNullable(body.detail || body.description, 5000),
    note: cleanNullable(body.note, 5000),
    amount: normalizeOptionalNumber(body.amount),
    status: cleanString(body.status, 50),
    overtimeStart: cleanTime(body.overtimeStart || body.overtime_start_time),
    overtimeEnd: cleanTime(body.overtimeEnd || body.overtime_end_time),
    overtimeHours: normalizeOptionalNumber(body.overtimeHours ?? body.overtime_hours),
    overtimeRateType: cleanNullable(body.overtimeRateType || body.overtime_rate_type, 50),
    overtimeRate: normalizeOptionalNumber(body.overtimeRate ?? body.overtime_rate),
    hourlyWage: normalizeOptionalNumber(body.hourlyWage ?? body.hourly_wage),
    overtimeReason: cleanNullable(body.overtimeReason || body.overtime_reason, 5000),
    repairReference: cleanNullable(body.repairReference || body.repair_reference, 255),
    licensePlate: cleanNullable(body.licensePlate || body.license_plate, 100),
    customerName: cleanNullable(body.customerName || body.customer_name, 255),
    commissionBase: normalizeOptionalNumber(body.commissionBase ?? body.commission_base),
    commissionPercent: normalizeOptionalNumber(body.commissionPercent ?? body.commission_percent),
    calculationNote: cleanNullable(body.calculationNote || body.calculation_note, 5000),
    sourceType: cleanNullable(body.sourceType || body.source_type, 100) || 'manual',
    sourceId: cleanNullable(body.sourceId || body.source_id, 100),
    createdAt: cleanDateTime(body.createdAt),
  };
}

export function normalizeAttendanceSettingsRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id || '',
    morningStart: formatSqlTime(row.morning_start),
    morningLateAfter: formatSqlTime(row.morning_late_after),
    lunchOut: formatSqlTime(row.lunch_out),
    afternoonStart: formatSqlTime(row.afternoon_start),
    afternoonLateAfter: formatSqlTime(row.afternoon_late_after),
    workEnd: formatSqlTime(row.work_end),
    source: row.source || 'api',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function normalizeAttendanceSettingsInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || 'attendance-settings-default',
    employeeId: cleanNullable(body.employeeId, 64),
    morningStart: cleanTime(body.morningStart) || `${DEFAULT_ATTENDANCE_SETTINGS.morningStart}:00`,
    morningLateAfter: cleanTime(body.morningLateAfter) || `${DEFAULT_ATTENDANCE_SETTINGS.morningLateAfter}:00`,
    lunchOut: cleanTime(body.lunchOut) || `${DEFAULT_ATTENDANCE_SETTINGS.lunchOut}:00`,
    afternoonStart: cleanTime(body.afternoonStart) || `${DEFAULT_ATTENDANCE_SETTINGS.afternoonStart}:00`,
    afternoonLateAfter: cleanTime(body.afternoonLateAfter) || `${DEFAULT_ATTENDANCE_SETTINGS.afternoonLateAfter}:00`,
    workEnd: cleanTime(body.workEnd) || `${DEFAULT_ATTENDANCE_SETTINGS.workEnd}:00`,
    source: cleanString(body.source, 32) || 'api',
  };
}

export function buildYearMonthDayFilters(url, column = 'work_date') {
  const where = [];
  const params = [];
  const day = cleanString(url.searchParams.get('day'), 2);
  const month = cleanString(url.searchParams.get('month'), 2);
  const year = cleanString(url.searchParams.get('year'), 4);

  if (/^\d{4}$/.test(year)) {
    where.push(`YEAR(${column}) = ?`);
    params.push(year);
  }
  if (/^\d{2}$/.test(month)) {
    where.push(`MONTH(${column}) = ?`);
    params.push(month);
  }
  if (/^\d{2}$/.test(day)) {
    where.push(`DAY(${column}) = ?`);
    params.push(day);
  }

  return { where, params };
}

export { cleanDate, cleanString, query };
