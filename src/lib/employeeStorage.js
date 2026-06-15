import { query } from './db';

const DEFAULT_ATTENDANCE_SETTINGS = {
  morningStart: '09:00',
  morningLateAfter: '09:06',
  lunchOut: '12:30',
  afternoonStart: '13:30',
  afternoonLateAfter: '13:31',
  workEnd: '18:00',
};

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

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatSqlTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
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

export async function ensureEmployeesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(255) NOT NULL,
      name VARCHAR(255) NULL,
      role VARCHAR(100) NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(100) NULL DEFAULT 'working',
      first_name VARCHAR(255) NULL,
      last_name VARCHAR(255) NULL,
      nickname VARCHAR(255) NULL,
      position VARCHAR(255) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_employees_code (code(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const columnSql = [
    'ALTER TABLE employees ADD COLUMN name VARCHAR(255) NULL',
    'ALTER TABLE employees ADD COLUMN role VARCHAR(100) NULL',
    'ALTER TABLE employees ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1',
    "ALTER TABLE employees ADD COLUMN status VARCHAR(100) NULL DEFAULT 'working'",
    'ALTER TABLE employees ADD COLUMN first_name VARCHAR(255) NULL',
    'ALTER TABLE employees ADD COLUMN last_name VARCHAR(255) NULL',
    'ALTER TABLE employees ADD COLUMN nickname VARCHAR(255) NULL',
    'ALTER TABLE employees ADD COLUMN position VARCHAR(255) NULL',
    'ALTER TABLE employees ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE employees ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  ];

  for (const sql of columnSql) await ensureColumn(sql);

  await ensureIndex('ALTER TABLE employees ADD UNIQUE KEY idx_employees_code (code(255))');
  await ensureIndex('CREATE INDEX idx_employees_status ON employees(status)');
  await ensureIndex('CREATE INDEX idx_employees_position ON employees(position)');

  await query(
    `INSERT IGNORE INTO employees (id, code, name, role, active, status, first_name, last_name, nickname, position)
     VALUES (?, ?, ?, ?, 1, 'working', ?, ?, ?, ?)`,
    ['emp-default', 'jBm1679800329229#ProAuto!', 'JBM Admin', 'admin', 'JBM', 'Admin', 'Admin', 'Owner']
  );
}

export async function ensureEmployeePositionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS employee_positions (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_employee_positions_name (name(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureIndex('ALTER TABLE employee_positions ADD UNIQUE KEY idx_employee_positions_name (name(255))');
  await ensureIndex('CREATE INDEX idx_employee_positions_sort_order ON employee_positions(sort_order)');

  const defaultPositions = [
    ['position-owner', 'เจ้าของอู่', 1],
    ['position-manager', 'ผู้จัดการ', 2],
    ['position-accounting', 'พนักงานบัญชี', 3],
    ['position-stock', 'พนักงานสต็อก', 4],
    ['position-mechanic', 'ช่าง', 5],
  ];

  for (const [id, name, sortOrder] of defaultPositions) {
    await query(
      `INSERT IGNORE INTO employee_positions (id, name, sort_order, active)
       VALUES (?, ?, ?, 1)`,
      [id, name, sortOrder]
    );
  }
}

export async function ensureAttendanceLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id VARCHAR(64) PRIMARY KEY,
      employee_id VARCHAR(64) NOT NULL,
      employee_code VARCHAR(255) NULL,
      date DATE NOT NULL,
      morning_in TIME NULL,
      lunch_out TIME NULL,
      afternoon_in TIME NULL,
      evening_out TIME NULL,
      method VARCHAR(100) NULL,
      status VARCHAR(100) NULL,
      hours DECIMAL(10,2) NOT NULL DEFAULT 0,
      source VARCHAR(32) NOT NULL DEFAULT 'api',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureIndex('CREATE INDEX idx_attendance_logs_employee_id ON attendance_logs(employee_id)');
  await ensureIndex('CREATE INDEX idx_attendance_logs_date ON attendance_logs(date)');
  await ensureIndex('CREATE INDEX idx_attendance_logs_status ON attendance_logs(status)');
}

export async function ensureLeaveLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS leave_logs (
      id VARCHAR(64) PRIMARY KEY,
      employee_id VARCHAR(64) NOT NULL,
      employee_code VARCHAR(255) NULL,
      type VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days DECIMAL(10,2) NOT NULL DEFAULT 0,
      approver VARCHAR(255) NULL,
      reason TEXT NULL,
      submitted_at DATE NULL,
      source VARCHAR(32) NOT NULL DEFAULT 'api',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureIndex('CREATE INDEX idx_leave_logs_employee_id ON leave_logs(employee_id)');
  await ensureIndex('CREATE INDEX idx_leave_logs_date ON leave_logs(start_date)');
  await ensureIndex('CREATE INDEX idx_leave_logs_end_date ON leave_logs(end_date)');
}

export async function ensureAttendanceSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS attendance_settings (
      id VARCHAR(64) PRIMARY KEY,
      employee_id VARCHAR(64) NULL,
      morning_start TIME NULL,
      morning_late_after TIME NULL,
      lunch_out TIME NULL,
      afternoon_start TIME NULL,
      afternoon_late_after TIME NULL,
      work_end TIME NULL,
      source VARCHAR(32) NOT NULL DEFAULT 'api',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureIndex('CREATE INDEX idx_attendance_settings_employee_id ON attendance_settings(employee_id)');

  await query(
    `INSERT IGNORE INTO attendance_settings (
      id, employee_id, morning_start, morning_late_after, lunch_out, afternoon_start, afternoon_late_after, work_end, source
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'seed')`,
    [
      'attendance-settings-default',
      `${DEFAULT_ATTENDANCE_SETTINGS.morningStart}:00`,
      `${DEFAULT_ATTENDANCE_SETTINGS.morningLateAfter}:00`,
      `${DEFAULT_ATTENDANCE_SETTINGS.lunchOut}:00`,
      `${DEFAULT_ATTENDANCE_SETTINGS.afternoonStart}:00`,
      `${DEFAULT_ATTENDANCE_SETTINGS.afternoonLateAfter}:00`,
      `${DEFAULT_ATTENDANCE_SETTINGS.workEnd}:00`,
    ]
  );
}

export async function ensureEmployeeStorageTables() {
  await ensureEmployeesTable();
  await ensureEmployeePositionsTable();
  await ensureAttendanceLogsTable();
  await ensureLeaveLogsTable();
  await ensureAttendanceSettingsTable();
}

export async function isAuthorizedToken(request) {
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

export function normalizeEmployeeRow(row) {
  return {
    id: row.id,
    code: row.code || '',
    status: row.status || 'working',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    nickname: row.nickname || '',
    position: row.position || '',
    role: row.role || '',
    active: Boolean(row.active),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

export function normalizeEmployeeInput(body = {}) {
  const status = cleanString(body.status, 100) || 'working';
  const firstName = cleanString(body.firstName, 255);
  const lastName = cleanString(body.lastName, 255);
  const active = body.active === undefined ? status !== 'ลาออก' : normalizeBoolean(body.active, true);

  return {
    id: cleanString(body.id, 64) || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: cleanString(body.code, 255),
    name: cleanNullable(body.name, 255) || cleanNullable(`${firstName} ${lastName}`, 255),
    role: cleanNullable(body.role, 100),
    active,
    status,
    firstName,
    lastName,
    nickname: cleanString(body.nickname, 255),
    position: cleanString(body.position, 255),
    createdAt: cleanDateTime(body.createdAt),
  };
}

export function normalizeEmployeePositionRow(row) {
  return {
    id: row.id,
    name: row.name || '',
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
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
    date: formatSqlDate(row.date),
    morningIn: formatSqlTime(row.morning_in),
    lunchOut: formatSqlTime(row.lunch_out),
    afternoonIn: formatSqlTime(row.afternoon_in),
    eveningOut: formatSqlTime(row.evening_out),
    method: row.method || '',
    status: row.status || '',
    hours: Number(row.hours || 0),
    source: row.source || 'api',
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

export function normalizeAttendanceLogInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: cleanString(body.employeeId, 64),
    employeeCode: cleanNullable(body.employeeCode, 255),
    date: cleanDate(body.date),
    morningIn: cleanTime(body.morningIn),
    lunchOut: cleanTime(body.lunchOut),
    afternoonIn: cleanTime(body.afternoonIn),
    eveningOut: cleanTime(body.eveningOut),
    method: cleanNullable(body.method, 100),
    status: cleanNullable(body.status, 100),
    hours: Math.max(0, normalizeNumber(body.hours, 0)),
    source: cleanString(body.source, 32) || 'api',
    createdAt: cleanDateTime(body.createdAt),
  };
}

export function normalizeLeaveLogRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code || '',
    type: row.type || '',
    startDate: formatSqlDate(row.start_date),
    endDate: formatSqlDate(row.end_date),
    totalDays: Number(row.total_days || 0),
    approver: row.approver || '',
    reason: row.reason || '',
    submittedAt: formatSqlDate(row.submitted_at),
    source: row.source || 'api',
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

export function normalizeLeaveLogInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: cleanString(body.employeeId, 64),
    employeeCode: cleanNullable(body.employeeCode, 255),
    type: cleanString(body.type, 100),
    startDate: cleanDate(body.startDate),
    endDate: cleanDate(body.endDate),
    totalDays: Math.max(0, normalizeNumber(body.totalDays, 0)),
    approver: cleanNullable(body.approver, 255),
    reason: cleanNullable(body.reason, 5000),
    submittedAt: cleanDate(body.submittedAt),
    source: cleanString(body.source, 32) || 'api',
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
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
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

export function buildYearMonthDayFilters(url, column = 'date') {
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
