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

async function ensureIndex(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (![1061, 1062].includes(Number(error?.errno || 0))) throw error;
  }
}

function parseAddColumnSql(sql) {
  const match = String(sql).match(/^\s*ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+ADD\s+COLUMN\s+`?([a-zA-Z0-9_]+)`?/i);
  if (!match) return null;
  return { tableName: match[1], columnName: match[2] };
}

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureColumn(sql) {
  const addColumn = parseAddColumnSql(sql);
  if (addColumn && await columnExists(addColumn.tableName, addColumn.columnName)) return;

  try {
    await query(sql);
  } catch (error) {
    const errno = Number(error?.errno || 0);
    if (errno === 1060) return;

    if ([1205, 1213].includes(errno) && addColumn) {
      await wait(150);
      if (await columnExists(addColumn.tableName, addColumn.columnName)) return;
      try {
        await query(sql);
        return;
      } catch (retryError) {
        const retryErrno = Number(retryError?.errno || 0);
        if (retryErrno === 1060) return;
        if ([1205, 1213].includes(retryErrno) && await columnExists(addColumn.tableName, addColumn.columnName)) return;
        throw retryError;
      }
    }

    throw error;
  }
}

let employeeSchemaEnsurePromise = Promise.resolve();

function withEmployeeSchemaEnsureLock(task) {
  const run = employeeSchemaEnsurePromise.catch(() => {}).then(task);
  employeeSchemaEnsurePromise = run.catch(() => {});
  return run;
}

async function ensureEmployeesTableInternal() {
  await query(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(64) PRIMARY KEY,
      employee_code VARCHAR(100) NOT NULL,
      first_name VARCHAR(255) NULL,
      last_name VARCHAR(255) NULL,
      nickname VARCHAR(100) NULL,
      position VARCHAR(100) NULL,
      phone VARCHAR(50) NULL,
      photo_url VARCHAR(500) NULL,
      status VARCHAR(50) DEFAULT 'ทำงานอยู่',
      start_date DATE NULL,
      note TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_employees_employee_code (employee_code),
      INDEX idx_employees_status (status),
      INDEX idx_employees_position (position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE employees ADD COLUMN employee_code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN code VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN role VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumn('ALTER TABLE employees ADD COLUMN first_name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN last_name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN nickname VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN position VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN phone VARCHAR(50) NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN photo_url VARCHAR(500) NULL');
  await ensureColumn("ALTER TABLE employees ADD COLUMN status VARCHAR(50) DEFAULT 'ทำงานอยู่'");
  await ensureColumn('ALTER TABLE employees ADD COLUMN start_date DATE NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN note TEXT NULL');
  await ensureColumn('ALTER TABLE employees ADD COLUMN createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE employees ADD COLUMN updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE employees ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE employees ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await ensureIndex('CREATE UNIQUE INDEX idx_employees_employee_code ON employees(employee_code)');
  await ensureIndex('CREATE INDEX idx_employees_status ON employees(status)');
  await ensureIndex('CREATE INDEX idx_employees_position ON employees(position)');

  await query(`
    UPDATE employees
    SET
      employee_code = COALESCE(employee_code, code),
      code = COALESCE(code, employee_code),
      created_at = COALESCE(created_at, createdAt),
      updated_at = COALESCE(updated_at, updatedAt)
    WHERE employee_code IS NULL OR code IS NULL OR created_at IS NULL OR updated_at IS NULL
  `).catch(() => {});
}

async function ensureEmployeePositionsTableInternal() {
  await query(`
    CREATE TABLE IF NOT EXISTS employee_positions (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_employee_positions_name (name),
      INDEX idx_employee_positions_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE employee_positions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE employee_positions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await query(`
    UPDATE employee_positions
    SET
      created_at = COALESCE(created_at, createdAt),
      updated_at = COALESCE(updated_at, updatedAt)
    WHERE created_at IS NULL OR updated_at IS NULL
  `).catch(() => {});

  for (const [id, name, sortOrder] of DEFAULT_POSITIONS) {
    await query(
      `INSERT IGNORE INTO employee_positions (id, name, sort_order, active)
       VALUES (?, ?, ?, 1)`,
      [id, name, sortOrder]
    );
  }
}

async function ensureAttendanceLogsTableInternal() {
  await ensureEmployeesTableInternal();
  await query(`
    CREATE TABLE IF NOT EXISTS employee_attendance (
      id VARCHAR(64) PRIMARY KEY,
      employee_id VARCHAR(64) NOT NULL,
      work_date DATE NOT NULL,
      check_in_time TIME NULL,
      lunch_out_time TIME NULL,
      lunch_in_time TIME NULL,
      check_out_time TIME NULL,
      status VARCHAR(100) NULL,
      total_hours DECIMAL(5,2) DEFAULT 0,
      ot_hours DECIMAL(5,2) DEFAULT 0,
      note TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_employee_attendance_unique (employee_id, work_date),
      INDEX idx_employee_attendance_work_date (work_date),
      INDEX idx_employee_attendance_status (status),
      CONSTRAINT fk_employee_attendance_employee_id
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE employee_attendance ADD COLUMN note TEXT NULL');
  await ensureColumn('ALTER TABLE employee_attendance ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE employee_attendance ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
}

async function ensureLeaveLogsTableInternal() {
  await ensureEmployeesTableInternal();
  await query(`
    CREATE TABLE IF NOT EXISTS employee_leaves (
      id VARCHAR(64) PRIMARY KEY,
      employee_id VARCHAR(64) NOT NULL,
      leave_type VARCHAR(100) NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      total_days DECIMAL(5,2) DEFAULT 0,
      reason TEXT NULL,
      approver VARCHAR(255) NULL,
      status VARCHAR(50) DEFAULT 'รออนุมัติ',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_employee_leaves_employee_id (employee_id),
      INDEX idx_employee_leaves_start_date (start_date),
      INDEX idx_employee_leaves_status (status),
      CONSTRAINT fk_employee_leaves_employee_id
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn("ALTER TABLE employee_leaves ADD COLUMN status VARCHAR(50) DEFAULT 'รออนุมัติ'");
  await ensureColumn('ALTER TABLE employee_leaves ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE employee_leaves ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
}

async function ensureAttendanceSettingsTableInternal() {
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_attendance_settings_employee_id (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE attendance_settings ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE attendance_settings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

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

export async function ensureEmployeesTable() {
  return withEmployeeSchemaEnsureLock(ensureEmployeesTableInternal);
}

export async function ensureEmployeePositionsTable() {
  return withEmployeeSchemaEnsureLock(ensureEmployeePositionsTableInternal);
}

export async function ensureAttendanceLogsTable() {
  return withEmployeeSchemaEnsureLock(ensureAttendanceLogsTableInternal);
}

export async function ensureLeaveLogsTable() {
  return withEmployeeSchemaEnsureLock(ensureLeaveLogsTableInternal);
}

export async function ensureAttendanceSettingsTable() {
  return withEmployeeSchemaEnsureLock(ensureAttendanceSettingsTableInternal);
}

export async function ensureEmployeeStorageTables() {
  return withEmployeeSchemaEnsureLock(async () => {
    await ensureEmployeesTableInternal();
    await ensureEmployeePositionsTableInternal();
    await ensureAttendanceLogsTableInternal();
    await ensureLeaveLogsTableInternal();
    await ensureAttendanceSettingsTableInternal();
  });
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
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code || '',
    type: row.leave_type || '',
    startDate: formatSqlDate(row.start_date),
    endDate: formatSqlDate(row.end_date),
    totalDays: Number(row.total_days || 0),
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
    approver: cleanNullable(body.approver, 255),
    reason: cleanNullable(body.reason, 5000),
    status: cleanString(body.status, 50) || 'รออนุมัติ',
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

export { cleanDate, cleanString, ensureColumn, ensureIndex, query };
