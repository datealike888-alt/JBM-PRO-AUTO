import { query } from '../../../lib/db';
import fs from 'fs/promises';
import path from 'path';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_REQUEST_BYTES = 12 * 1024 * 1024; // increased to allow larger base64 image payloads
const VALID_STATUSES = new Set([1, 2, 3, 4, 5]);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

async function findEmployeeByToken(token) {
  const employeeCode = String(token || '').trim();
  if (!employeeCode) return null;
  await ensureEmployeesTable();
  const rows = await query(
    'SELECT id, code, name, role, active FROM employees WHERE code = ? AND active = 1 LIMIT 1',
    [employeeCode]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

async function isAuthorizedToken(request) {
  const suppliedToken = String(request.headers.get('x-vehicle-admin-token') || '').trim();
  if (!suppliedToken) return false;

  const configuredToken = process.env.VEHICLE_ADMIN_TOKEN;
  if (configuredToken && suppliedToken === configuredToken) {
    return true;
  }

  const employee = await findEmployeeByToken(suppliedToken);
  return Boolean(employee);
}

async function isAuthorizedMutation(request) {
  return isAuthorizedToken(request);
}

async function isAuthorizedRead(request) {
  return isAuthorizedToken(request);
}

function getContentLength(request) {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return 0;
  const length = Number(rawLength);
  return Number.isFinite(length) ? length : 0;
}

async function ensureVehiclesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(64) PRIMARY KEY,
      receiptNo VARCHAR(100),
      ownerName VARCHAR(255),
      phone VARCHAR(64),
      plateNo VARCHAR(64),
      brand VARCHAR(128),
      model VARCHAR(256),
      color VARCHAR(128),
      status INT,
      statusText TEXT,
      entryDate DATE,
      bookingTime VARCHAR(32),
      estimatedCompletion DATE,
      mileage INT,
      cost INT,
      vin VARCHAR(128),
      receiptName VARCHAR(255),
      receiptUrl MEDIUMTEXT,
      logs JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await query('ALTER TABLE vehicles ADD COLUMN mileage INT NULL');
  } catch (error) {
    const errno = Number(error?.errno || 0);
    if (errno !== 1060) {
      console.warn('[vehicles] unable to ensure vehicles.mileage column', error);
    }
  }
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await query('ALTER TABLE employees ADD UNIQUE KEY idx_employees_code (code(255))');
  } catch (error) {
    const errno = Number(error?.errno || 0);
    if (![1061, 1062].includes(errno)) {
      console.warn('[vehicles] unable to ensure employees.code index', error);
    }
  }

  await query(`
    INSERT IGNORE INTO employees (id, code, name, role, active)
    VALUES (?, ?, ?, ?, 1)
  `, [
    'emp-default',
    'jBm1679800329229#ProAuto!',
    'พนักงานอู่',
    'admin',
  ]);
}

function parseJsonLogs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[vehicles] failed to parse logs JSON', error, value);
    return [];
  }
}

function normalizeStatus(value) {
  const status = Number.parseInt(value, 10);
  return VALID_STATUSES.has(status) ? status : 1;
}

function normalizeCost(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0;
  }

  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (!cleaned) return 0;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 0) : 0;
}

function normalizeMileage(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const cleaned = String(value).replace(/[^0-9]/g, '');
  if (!cleaned) return null;

  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : null;
}

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return String(value);
}

function normalizeRow(row) {
  return {
    ...row,
    status: normalizeStatus(row.status),
    mileage: normalizeMileage(row.mileage),
    cost: normalizeCost(row.cost),
    logs: parseJsonLogs(row.logs),
    entryDate: formatSqlDate(row.entryDate),
    estimatedCompletion: formatSqlDate(row.estimatedCompletion),
  };
}

function normalizePublicRow(row) {
  const normalized = normalizeRow(row);
  return {
    id: normalized.id,
    receiptNo: normalized.receiptNo,
    ownerName: normalized.ownerName,
    plateNo: normalized.plateNo,
    brand: normalized.brand,
    model: normalized.model,
    status: normalized.status,
    statusText: normalized.statusText,
    entryDate: normalized.entryDate,
    estimatedCompletion: normalized.estimatedCompletion,
    mileage: normalized.mileage,
    receiptName: normalized.receiptName,
    receiptUrl: normalized.receiptUrl,
    logs: normalized.logs,
  };
}

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanDate(value) {
  const text = cleanString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

const MAX_RECEIPT_URL_LENGTH = 10_000_000;

function cleanReceiptUrl(value) {
  const text = cleanString(value, MAX_RECEIPT_URL_LENGTH);
  if (!text) return null;
  if (text.startsWith('data:image/')) return text;
  if (text.startsWith('/uploads/receipts/') || text.startsWith('/api/receipts/')) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? text : null;
  } catch {
    return null;
  }
}

function normalizeVehicleBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' };
  }

  const status = Number.parseInt(body.status || 1, 10);
  if (!VALID_STATUSES.has(status)) {
    return { error: 'Invalid vehicle status' };
  }

  const vehicle = {
    id: cleanString(body.id, 64) || `job-${Date.now()}`,
    receiptNo: cleanString(body.receiptNo, 100),
    ownerName: cleanString(body.ownerName, 255),
    phone: cleanString(body.phone, 64),
    plateNo: cleanString(body.plateNo, 64),
    brand: cleanString(body.brand, 128),
    model: cleanString(body.model, 256),
    color: cleanString(body.color, 128),
    status,
    statusText: cleanString(body.statusText, 2000),
    entryDate: cleanDate(body.entryDate),
    bookingTime: cleanString(body.bookingTime, 32),
    estimatedCompletion: cleanDate(body.estimatedCompletion),
    mileage: normalizeMileage(body.mileage),
    cost: normalizeCost(body.cost),
    vin: cleanString(body.vin, 128),
    receiptName: body.receiptName ? cleanString(body.receiptName, 255) : null,
    receiptUrl: cleanReceiptUrl(body.receiptUrl),
    logs: Array.isArray(body.logs)
      ? body.logs.slice(0, 100).map((log) => ({
          date: cleanString(log?.date, 64),
          text: cleanString(log?.text, 2000),
        }))
      : [],
  };

  if (!vehicle.ownerName || !vehicle.phone || !vehicle.entryDate) {
    return { error: 'Missing required vehicle fields' };
  }

  return { vehicle };
}

export async function GET(request) {
  try {
    await ensureVehiclesTable();

    const url = new URL(request.url);
    const wantsAdminData = url.searchParams.get('admin') === '1';
    if (wantsAdminData && !(await isAuthorizedRead(request))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (wantsAdminData) {
      const rows = await query('SELECT * FROM vehicles ORDER BY entryDate DESC, createdAt DESC LIMIT 500');
      return json(rows.map(normalizeRow), {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const search = cleanString(url.searchParams.get('search'), 100);
    if (!search) {
      return json([], { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const phoneSearch = search.replace(/[^0-9]/g, '');
    const likeSearch = `%${search.toLowerCase()}%`;
    const rows = await query(
      `SELECT * FROM vehicles
       WHERE LOWER(receiptNo) = ?
          OR LOWER(ownerName) LIKE ?
          OR (? <> '' AND REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '.', '') LIKE ?)
       ORDER BY entryDate DESC, createdAt DESC
       LIMIT 10`,
      [search.toLowerCase(), likeSearch, phoneSearch, `%${phoneSearch}%`]
    );

    return json(rows.map(normalizePublicRow), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[vehicles] GET failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

async function saveReceiptFile(base64Data, id) {
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+]+)(?:;[^,]+)*;base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format');
  }

  let ext = matches[1].toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';

  const allowed = new Set(['png', 'jpg', 'webp', 'gif']);
  if (!allowed.has(ext)) {
    throw new Error('Unsupported image format');
  }

  const data = Buffer.from(matches[2], 'base64');
  const filename = `receipt-${id}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, data);
  return `/api/receipts/${filename}`;
}

async function deleteReceiptFile(urlPath) {
  if (!urlPath) return;

  const receiptsDir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
  let filePath = null;

  if (urlPath.startsWith('/uploads/receipts/')) {
    filePath = path.join(process.cwd(), 'public', urlPath);
  } else if (urlPath.startsWith('/api/receipts/')) {
    const filename = path.basename(urlPath);
    filePath = path.join(receiptsDir, filename);
  } else {
    return;
  }

  await fs.unlink(filePath).catch(() => {});
}

export async function POST(request) {
  try {
    if (!(await isAuthorizedMutation(request))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (getContentLength(request) > MAX_REQUEST_BYTES) {
      return json({ error: 'Request body too large' }, { status: 413 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const normalized = normalizeVehicleBody(body);
    if (normalized.error) {
      return json({ error: normalized.error }, { status: 400 });
    }
    const { vehicle } = normalized;

    const existing = await query('SELECT receiptUrl FROM vehicles WHERE id = ? LIMIT 1', [vehicle.id]);
    const oldReceiptUrl = existing?.[0]?.receiptUrl;

    if (vehicle.receiptUrl && vehicle.receiptUrl.startsWith('data:image/')) {
      try {
        vehicle.receiptUrl = await saveReceiptFile(vehicle.receiptUrl, vehicle.id);
        if (oldReceiptUrl && oldReceiptUrl !== vehicle.receiptUrl) {
          await deleteReceiptFile(oldReceiptUrl);
        }
      } catch (err) {
        console.error('[vehicles] failed to save receipt file', err);
        return json({ error: 'ไม่สามารถบันทึกไฟล์รูปภาพใบเสร็จได้' }, { status: 500 });
      }
    }

    await ensureVehiclesTable();
    await query(
      `INSERT INTO vehicles (
        id, receiptNo, ownerName, phone, plateNo, brand, model, color,
        status, statusText, entryDate, bookingTime, estimatedCompletion, mileage,
        cost, vin, receiptName, receiptUrl, logs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        receiptNo = VALUES(receiptNo),
        ownerName = VALUES(ownerName),
        phone = VALUES(phone),
        plateNo = VALUES(plateNo),
        brand = VALUES(brand),
        model = VALUES(model),
        color = VALUES(color),
        status = VALUES(status),
        statusText = VALUES(statusText),
        entryDate = VALUES(entryDate),
        bookingTime = VALUES(bookingTime),
        estimatedCompletion = VALUES(estimatedCompletion),
        mileage = VALUES(mileage),
        cost = VALUES(cost),
        vin = VALUES(vin),
        receiptName = VALUES(receiptName),
        receiptUrl = VALUES(receiptUrl),
        logs = VALUES(logs)
    `,
      [
        vehicle.id,
        vehicle.receiptNo,
        vehicle.ownerName,
        vehicle.phone,
        vehicle.plateNo,
        vehicle.brand,
        vehicle.model,
        vehicle.color,
        vehicle.status,
        vehicle.statusText,
        vehicle.entryDate,
        vehicle.bookingTime,
        vehicle.estimatedCompletion,
        vehicle.mileage,
        vehicle.cost,
        vehicle.vin,
        vehicle.receiptName,
        vehicle.receiptUrl,
        JSON.stringify(vehicle.logs),
      ]
    );

    return json({ success: true, vehicle }, { status: 200 });
  } catch (error) {
    console.error('[vehicles] POST failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedMutation(request))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = cleanString(url.searchParams.get('id'), 64);
    if (!id) {
      return json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await ensureVehiclesTable();
    await query('DELETE FROM vehicles WHERE id = ?', [id]);

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[vehicles] DELETE failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}
