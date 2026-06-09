import { query } from '../../../lib/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const FINAL_STATUS = 'เสร็จรอส่ง';
const BOOKING_STATUS = 'จองคิว';
const HOLD_STATUSES = new Set([BOOKING_STATUS, FINAL_STATUS]);
const STATUS_OPTIONS = [
  'จองคิว',
  'กำลังตรวจเช็ค',
  'รออะไหล่',
  'กำลังซ่อม',
  'ซ่อมเสร็จรอส่ง',
  FINAL_STATUS,
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function getContentLength(request) {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return 0;
  const length = Number(rawLength);
  return Number.isFinite(length) ? length : 0;
}

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanNullableString(value, maxLength = 255) {
  const text = cleanString(value, maxLength);
  return text || null;
}

function cleanDate(value) {
  const text = cleanString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function normalizeStatus(value) {
  const raw = cleanString(value, 64);
  if (STATUS_OPTIONS.includes(raw)) return raw;
  const numeric = Number.parseInt(raw, 10);
  return STATUS_OPTIONS[numeric - 1] || BOOKING_STATUS;
}

function statusCode(status) {
  const index = STATUS_OPTIONS.indexOf(normalizeStatus(status));
  return index >= 0 ? index + 1 : 1;
}

function normalizeMoney(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
  }
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function normalizeMileage(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : null;
}

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function parseJsonLogs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
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

async function ensureVehiclesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(64) PRIMARY KEY,
      invoice_number VARCHAR(100) NOT NULL,
      license_plate VARCHAR(64) NOT NULL,
      owner_name VARCHAR(255) NULL,
      phone VARCHAR(64) NULL,
      brand VARCHAR(128) NOT NULL,
      model VARCHAR(256) NOT NULL,
      color VARCHAR(128) NULL,
      vin VARCHAR(128) NULL,
      mileage INT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'จองคิว',
      status_code INT NOT NULL DEFAULT 1,
      status_note TEXT NULL,
      repair_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      appointment_date DATE NULL,
      received_date DATE NULL,
      due_date DATE NULL,
      delivered_date DATE NULL,
      note TEXT NULL,
      image_path MEDIUMTEXT NULL,
      image_name VARCHAR(255) NULL,
      logs JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      receiptNo VARCHAR(100) NULL,
      ownerName VARCHAR(255) NULL,
      plateNo VARCHAR(64) NULL,
      statusText TEXT NULL,
      entryDate DATE NULL,
      bookingTime VARCHAR(32) NULL,
      estimatedCompletion DATE NULL,
      cost DECIMAL(12,2) NULL,
      receiptName VARCHAR(255) NULL,
      receiptUrl MEDIUMTEXT NULL,
      createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const columns = [
    "ALTER TABLE vehicles MODIFY COLUMN status VARCHAR(64) NOT NULL DEFAULT 'จองคิว'",
    'ALTER TABLE vehicles ADD COLUMN invoice_number VARCHAR(100) NULL',
    'ALTER TABLE vehicles ADD COLUMN license_plate VARCHAR(64) NULL',
    'ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(255) NULL',
    'ALTER TABLE vehicles ADD COLUMN status_code INT NOT NULL DEFAULT 1',
    'ALTER TABLE vehicles ADD COLUMN status_note TEXT NULL',
    'ALTER TABLE vehicles ADD COLUMN repair_cost DECIMAL(12,2) NOT NULL DEFAULT 0',
    'ALTER TABLE vehicles ADD COLUMN appointment_date DATE NULL',
    'ALTER TABLE vehicles ADD COLUMN received_date DATE NULL',
    'ALTER TABLE vehicles ADD COLUMN due_date DATE NULL',
    'ALTER TABLE vehicles ADD COLUMN delivered_date DATE NULL',
    'ALTER TABLE vehicles ADD COLUMN note TEXT NULL',
    'ALTER TABLE vehicles ADD COLUMN image_path MEDIUMTEXT NULL',
    'ALTER TABLE vehicles ADD COLUMN image_name VARCHAR(255) NULL',
    'ALTER TABLE vehicles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  ];
  for (const sql of columns) await ensureColumn(sql);

  await query(`
    UPDATE vehicles SET
      invoice_number = COALESCE(NULLIF(invoice_number, ''), receiptNo, id),
      license_plate = COALESCE(NULLIF(license_plate, ''), plateNo, ''),
      owner_name = COALESCE(owner_name, ownerName),
      status = CASE
        WHEN status IN ('1', 'จองคิว') THEN 'จองคิว'
        WHEN status IN ('2', 'เช็ครถ', 'กำลังตรวจเช็ค') THEN 'กำลังตรวจเช็ค'
        WHEN status IN ('3', 'รออะไหล่') THEN 'รออะไหล่'
        WHEN status IN ('4', 'กำลังซ่อม') THEN 'กำลังซ่อม'
        WHEN status IN ('5', 'เสร็จรอส่ง') THEN 'เสร็จรอส่ง'
        WHEN status IN ('6', 'ซ่อมเสร็จรอส่ง') THEN 'ซ่อมเสร็จรอส่ง'
        ELSE COALESCE(NULLIF(status, ''), 'จองคิว')
      END,
      status_note = COALESCE(status_note, statusText),
      repair_cost = COALESCE(NULLIF(repair_cost, 0), cost, 0),
      appointment_date = COALESCE(appointment_date, entryDate),
      received_date = COALESCE(received_date, entryDate),
      due_date = COALESCE(due_date, estimatedCompletion),
      image_path = COALESCE(image_path, receiptUrl),
      image_name = COALESCE(image_name, receiptName)
  `);

  await ensureIndex('CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate)');
  await ensureIndex('CREATE INDEX idx_vehicles_phone ON vehicles(phone)');
  await ensureIndex('CREATE INDEX idx_vehicles_invoice_number ON vehicles(invoice_number)');
  await ensureIndex('CREATE INDEX idx_vehicles_status_new ON vehicles(status)');
  await ensureIndex('CREATE INDEX idx_vehicles_received_date ON vehicles(received_date)');
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureIndex('ALTER TABLE employees ADD UNIQUE KEY idx_employees_code (code(255))');
  await query(
    `INSERT IGNORE INTO employees (id, code, name, role, active)
     VALUES (?, ?, ?, ?, 1)`,
    ['emp-default', 'jBm1679800329229#ProAuto!', 'พนักงานอู่', 'admin']
  );
}

async function findEmployeeByToken(token) {
  const employeeCode = String(token || '').trim();
  if (!employeeCode) return null;
  await ensureEmployeesTable();
  const rows = await query(
    'SELECT id, code, name, role, active FROM employees WHERE code = ? AND active = 1 LIMIT 1',
    [employeeCode]
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function isAuthorizedToken(request) {
  const suppliedToken = String(request.headers.get('x-vehicle-admin-token') || '').trim();
  if (!suppliedToken) return false;
  const configuredToken = process.env.VEHICLE_ADMIN_TOKEN;
  if (configuredToken && suppliedToken === configuredToken) return true;
  return Boolean(await findEmployeeByToken(suppliedToken));
}

function normalizeRow(row) {
  const status = normalizeStatus(row.status);
  const invoiceNumber = row.invoice_number || row.receiptNo || '';
  const licensePlate = row.license_plate || row.plateNo || '';
  const imagePath = row.image_path || row.receiptUrl || null;
  const cost = normalizeMoney(row.repair_cost ?? row.cost);
  const appointmentDate = formatSqlDate(row.appointment_date || row.entryDate);
  const receivedDate = formatSqlDate(row.received_date || row.entryDate);
  const dueDate = formatSqlDate(row.due_date || row.estimatedCompletion);

  return {
    id: row.id,
    invoice_number: invoiceNumber,
    license_plate: licensePlate,
    owner_name: row.owner_name || row.ownerName || null,
    phone: row.phone || null,
    brand: row.brand || '',
    model: row.model || '',
    color: row.color || '',
    vin: row.vin || '',
    mileage: normalizeMileage(row.mileage),
    status,
    status_code: statusCode(status),
    status_note: row.status_note || row.statusText || '',
    repair_cost: cost,
    appointment_date: appointmentDate,
    received_date: receivedDate,
    due_date: dueDate,
    delivered_date: formatSqlDate(row.delivered_date),
    note: row.note || '',
    image_path: imagePath,
    image_name: row.image_name || row.receiptName || null,
    created_at: row.created_at || row.createdAt || null,
    updated_at: row.updated_at || null,
    logs: parseJsonLogs(row.logs),
    receiptNo: invoiceNumber,
    plateNo: licensePlate,
    ownerName: row.owner_name || row.ownerName || null,
    statusText: row.status_note || row.statusText || '',
    entryDate: receivedDate || appointmentDate,
    bookingTime: row.bookingTime || '',
    estimatedCompletion: dueDate,
    cost,
    receiptName: row.image_name || row.receiptName || null,
    receiptUrl: imagePath,
  };
}

function normalizePublicRow(row) {
  const normalized = normalizeRow(row);
  return {
    id: normalized.id,
    invoice_number: normalized.invoice_number,
    license_plate: normalized.license_plate,
    owner_name: normalized.owner_name,
    phone: normalized.phone,
    brand: normalized.brand,
    model: normalized.model,
    color: normalized.color,
    vin: normalized.vin,
    mileage: normalized.mileage,
    status: normalized.status,
    status_code: normalized.status_code,
    status_note: normalized.status_note,
    appointment_date: normalized.appointment_date,
    received_date: normalized.received_date,
    due_date: normalized.due_date,
    image_path: normalized.image_path,
    note: normalized.note,
    logs: normalized.logs,
  };
}

function cleanImagePath(value) {
  const text = cleanString(value, 10_000_000);
  if (!text) return null;
  if (text.startsWith('data:image/')) return text;
  if (text.startsWith('/uploads/') || text.startsWith('/api/receipts/')) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? text : null;
  } catch {
    return null;
  }
}

function normalizeVehicleBody(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' };

  const status = normalizeStatus(body.status ?? body.status_code);
  const invoiceNumber = cleanString(body.invoice_number ?? body.receiptNo, 100);
  const licensePlate = cleanString(body.license_plate ?? body.plateNo, 64);
  const brand = cleanString(body.brand, 128);
  const model = cleanString(body.model, 256);

  if (!invoiceNumber || !licensePlate || !brand || !model) {
    return { error: 'กรุณากรอกเลขใบแจ้งหนี้/ใบเสร็จ ทะเบียนรถ ยี่ห้อ และรุ่นรถ' };
  }

  const appointmentDate = cleanDate(body.appointment_date ?? body.entryDate);
  const receivedDate = cleanDate(body.received_date ?? body.entryDate);
  const dueDate = cleanDate(body.due_date ?? body.estimatedCompletion);
  const deliveredDate = status === FINAL_STATUS
    ? cleanDate(body.delivered_date) || new Date().toISOString().slice(0, 10)
    : cleanDate(body.delivered_date);

  return {
    vehicle: {
      id: cleanString(body.id, 64) || `job-${Date.now()}`,
      invoice_number: invoiceNumber,
      license_plate: licensePlate,
      owner_name: cleanNullableString(body.owner_name ?? body.ownerName, 255),
      phone: cleanNullableString(body.phone, 64),
      brand,
      model,
      color: cleanNullableString(body.color, 128),
      vin: cleanNullableString(body.vin, 128),
      mileage: normalizeMileage(body.mileage),
      status,
      status_code: statusCode(status),
      status_note: cleanNullableString(body.status_note ?? body.statusText, 2000),
      repair_cost: normalizeMoney(body.repair_cost ?? body.cost),
      appointment_date: appointmentDate,
      received_date: receivedDate,
      due_date: dueDate,
      delivered_date: deliveredDate,
      note: cleanNullableString(body.note, 4000),
      image_path: cleanImagePath(body.image_path ?? body.receiptUrl),
      image_name: cleanNullableString(body.image_name ?? body.receiptName, 255),
      logs: Array.isArray(body.logs)
        ? body.logs.slice(0, 120).map((log) => ({
            date: cleanString(log?.date, 64),
            text: cleanString(log?.text, 2000),
          }))
        : [],
      bookingTime: cleanNullableString(body.bookingTime, 32),
    },
  };
}

function buildDateWhere(url) {
  const params = [];
  const where = [];
  const day = cleanString(url.searchParams.get('day'), 2);
  const month = cleanString(url.searchParams.get('month'), 2);
  const year = cleanString(url.searchParams.get('year'), 4);

  if (/^\d{4}$/.test(year)) {
    where.push('YEAR(COALESCE(received_date, appointment_date, created_at)) = ?');
    params.push(year);
  }
  if (/^\d{2}$/.test(month)) {
    where.push('MONTH(COALESCE(received_date, appointment_date, created_at)) = ?');
    params.push(month);
  }
  if (/^\d{2}$/.test(day)) {
    where.push('DAY(COALESCE(received_date, appointment_date, created_at)) = ?');
    params.push(day);
  }

  return { clause: where.length ? ` AND ${where.join(' AND ')}` : '', params };
}

function rowsForPeriod(rows, period) {
  const keyFor = (row) => {
    const date = row.delivered_date || row.received_date || row.appointment_date || row.created_at;
    const value = formatSqlDate(date) || '';
    if (period === 'year') return value.slice(0, 4);
    if (period === 'month') return value.slice(0, 7);
    return value.slice(0, 10);
  };

  const map = new Map();
  for (const row of rows) {
    const key = keyFor(row) || 'ไม่ระบุวันที่';
    const current = map.get(key) || { label: key, vehicles: 0, revenue: 0, in_shop: 0 };
    current.vehicles += 1;
    if (normalizeStatus(row.status) === FINAL_STATUS) {
      current.revenue += normalizeMoney(row.repair_cost);
    }
    if (!HOLD_STATUSES.has(normalizeStatus(row.status))) {
      current.in_shop += 1;
    }
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

export async function GET(request) {
  try {
    await ensureVehiclesTable();

    const url = new URL(request.url);
    const wantsAdminData = url.searchParams.get('admin') === '1';
    const wantsSummary = url.searchParams.get('summary') === '1';
    const wantsInShop = url.searchParams.get('in_shop') === '1';
    const status = cleanString(url.searchParams.get('status'), 64);

    if ((wantsAdminData || wantsSummary || wantsInShop || status) && !(await isAuthorizedToken(request))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (wantsSummary) {
      const rows = (await query('SELECT * FROM vehicles ORDER BY COALESCE(received_date, appointment_date, created_at) ASC LIMIT 5000')).map(normalizeRow);
      const today = new Date().toISOString().slice(0, 10);
      const month = today.slice(0, 7);
      const year = today.slice(0, 4);
      const finalRows = rows.filter((row) => row.status === FINAL_STATUS);
      const inShopRows = rows.filter((row) => !HOLD_STATUSES.has(row.status));
      return json({
        totals: {
          all: rows.length,
          booking: rows.filter((row) => row.status === BOOKING_STATUS).length,
          checking: rows.filter((row) => row.status === 'กำลังตรวจเช็ค').length,
          repairing: rows.filter((row) => row.status === 'กำลังซ่อม').length,
          in_shop: inShopRows.length,
          ready_to_deliver: rows.filter((row) => row.status === FINAL_STATUS).length,
          revenue_today: finalRows.filter((row) => (row.delivered_date || row.received_date || '').startsWith(today)).reduce((sum, row) => sum + row.repair_cost, 0),
          revenue_month: finalRows.filter((row) => (row.delivered_date || row.received_date || '').startsWith(month)).reduce((sum, row) => sum + row.repair_cost, 0),
          revenue_year: finalRows.filter((row) => (row.delivered_date || row.received_date || '').startsWith(year)).reduce((sum, row) => sum + row.repair_cost, 0),
        },
        revenue: rowsForPeriod(finalRows, url.searchParams.get('period') || 'month'),
        in_shop_chart: rowsForPeriod(inShopRows, url.searchParams.get('period') || 'month'),
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (wantsAdminData || wantsInShop || status) {
      const dateWhere = buildDateWhere(url);
      const filters = [];
      const params = [];
      if (wantsInShop) {
        filters.push('status NOT IN (?, ?)');
        params.push(BOOKING_STATUS, FINAL_STATUS);
      }
      if (status) {
        filters.push('status = ?');
        params.push(normalizeStatus(status));
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : 'WHERE 1=1';
      const rows = await query(
        `SELECT * FROM vehicles ${where}${dateWhere.clause}
         ORDER BY COALESCE(received_date, appointment_date, created_at) DESC, created_at DESC LIMIT 1000`,
        [...params, ...dateWhere.params]
      );
      return json(rows.map(normalizeRow), { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const search = cleanString(url.searchParams.get('search'), 100);
    if (!search) {
      return json([], { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const phoneSearch = search.replace(/[^0-9]/g, '');
    const likeSearch = `%${search.toLowerCase()}%`;
    const rows = await query(
      `SELECT * FROM vehicles
       WHERE LOWER(invoice_number) = ?
          OR LOWER(license_plate) LIKE ?
          OR LOWER(owner_name) LIKE ?
          OR (? <> '' AND REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), '-', ''), ' ', ''), '.', '') LIKE ?)
       ORDER BY COALESCE(received_date, appointment_date, created_at) DESC, created_at DESC
       LIMIT 10`,
      [search.toLowerCase(), likeSearch, likeSearch, phoneSearch, `%${phoneSearch}%`]
    );

    return json(rows.map(normalizePublicRow), { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[vehicles] GET failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

async function saveReceiptFile(base64Data, id) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return base64Data;
  }
  const result = await cloudinary.uploader.upload(base64Data, {
    folder: 'jbm-pro-auto/receipts',
    public_id: `vehicle-${id}-${Date.now()}`,
  });
  return result.secure_url;
}

export async function POST(request) {
  try {
    if (!(await isAuthorizedToken(request))) {
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
    if (normalized.error) return json({ error: normalized.error }, { status: 400 });

    const { vehicle } = normalized;
    if (vehicle.image_path?.startsWith('data:image/')) {
      vehicle.image_path = await saveReceiptFile(vehicle.image_path, vehicle.id);
    }

    await ensureVehiclesTable();
    await query(
      `INSERT INTO vehicles (
        id, invoice_number, license_plate, owner_name, phone, brand, model, color, vin, mileage,
        status, status_code, status_note, repair_cost, appointment_date, received_date, due_date,
        delivered_date, note, image_path, image_name, logs,
        receiptNo, ownerName, plateNo, statusText, entryDate, bookingTime, estimatedCompletion,
        cost, receiptName, receiptUrl
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        invoice_number = VALUES(invoice_number),
        license_plate = VALUES(license_plate),
        owner_name = VALUES(owner_name),
        phone = VALUES(phone),
        brand = VALUES(brand),
        model = VALUES(model),
        color = VALUES(color),
        vin = VALUES(vin),
        mileage = VALUES(mileage),
        status = VALUES(status),
        status_code = VALUES(status_code),
        status_note = VALUES(status_note),
        repair_cost = VALUES(repair_cost),
        appointment_date = VALUES(appointment_date),
        received_date = VALUES(received_date),
        due_date = VALUES(due_date),
        delivered_date = VALUES(delivered_date),
        note = VALUES(note),
        image_path = VALUES(image_path),
        image_name = VALUES(image_name),
        logs = VALUES(logs),
        receiptNo = VALUES(receiptNo),
        ownerName = VALUES(ownerName),
        plateNo = VALUES(plateNo),
        statusText = VALUES(statusText),
        entryDate = VALUES(entryDate),
        bookingTime = VALUES(bookingTime),
        estimatedCompletion = VALUES(estimatedCompletion),
        cost = VALUES(cost),
        receiptName = VALUES(receiptName),
        receiptUrl = VALUES(receiptUrl)`,
      [
        vehicle.id,
        vehicle.invoice_number,
        vehicle.license_plate,
        vehicle.owner_name,
        vehicle.phone,
        vehicle.brand,
        vehicle.model,
        vehicle.color,
        vehicle.vin,
        vehicle.mileage,
        vehicle.status,
        vehicle.status_code,
        vehicle.status_note,
        vehicle.repair_cost,
        vehicle.appointment_date,
        vehicle.received_date,
        vehicle.due_date,
        vehicle.delivered_date,
        vehicle.note,
        vehicle.image_path,
        vehicle.image_name,
        JSON.stringify(vehicle.logs),
        vehicle.invoice_number,
        vehicle.owner_name,
        vehicle.license_plate,
        vehicle.status_note,
        vehicle.received_date || vehicle.appointment_date,
        vehicle.bookingTime,
        vehicle.due_date,
        vehicle.repair_cost,
        vehicle.image_name,
        vehicle.image_path,
      ]
    );

    return json({ success: true, vehicle: normalizeRow(vehicle) }, { status: 200 });
  } catch (error) {
    console.error('[vehicles] POST failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedToken(request))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }
    const url = new URL(request.url);
    const id = cleanString(url.searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    await ensureVehiclesTable();
    await query('DELETE FROM vehicles WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[vehicles] DELETE failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}
