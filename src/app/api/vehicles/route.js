import { isAuthorizedAdminRequest } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { getAuthorizedAdminFromRequest } from '../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const DEFAULT_STATUS = 'จองคิว';
const FINAL_STATUS = 'ซ่อมเสร็จรอส่ง';
const CLOSED_STATUS = 'ปิดงาน';
const STATUS_OPTIONS = [
  'จองคิว',
  'กำลังตรวจเช็ค',
  'รออะไหล่',
  'กำลังซ่อม',
  FINAL_STATUS,
  CLOSED_STATUS,
];
const STATUS_ALIASES = new Map([
  ['1', 'จองคิว'],
  ['2', 'กำลังตรวจเช็ค'],
  ['3', 'รออะไหล่'],
  ['4', 'กำลังซ่อม'],
  ['5', FINAL_STATUS],
  ['6', CLOSED_STATUS],
  ['เช็ครถ', 'กำลังตรวจเช็ค'],
]);

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
  if (!text) return { value: null };
  const matched = text.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!matched) return { error: 'Invalid booking_time format' };
  return { value: `${matched[1]}:${matched[2]}:${matched[3] || '00'}` };
}

function normalizeStatusText(value) {
  return cleanString(value, 64).normalize('NFC');
}

function normalizeStatus(value) {
  const raw = normalizeStatusText(value);
  if (!raw) return DEFAULT_STATUS;
  const mapped = STATUS_ALIASES.get(raw) || raw;
  const matched = STATUS_OPTIONS.find((option) => normalizeStatusText(option) === normalizeStatusText(mapped));
  return matched || DEFAULT_STATUS;
}

function normalizeMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(value, 0) : 0;
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function normalizeMileage(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : null;
}

function formatSqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatSqlTime(value) {
  if (!value) return null;
  const text = String(value);
  const matched = text.match(/([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?/);
  return matched ? `${matched[1]}:${matched[2]}` : null;
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
      invoice_number VARCHAR(100) NULL,
      license_plate VARCHAR(64) NULL,
      owner_name VARCHAR(255) NULL,
      phone VARCHAR(64) NULL,
      brand VARCHAR(128) NULL,
      model VARCHAR(256) NULL,
      color VARCHAR(128) NULL,
      vin VARCHAR(128) NULL,
      mileage INT NULL,
      status VARCHAR(64) NULL DEFAULT 'จองคิว',
      repair_cost DECIMAL(12,2) NULL DEFAULT 0,
      booking_date DATE NULL,
      booking_time TIME NULL,
      estimated_completion_date DATE NULL,
      status_detail TEXT NULL,
      receipt_image MEDIUMTEXT NULL,
      receipt_images MEDIUMTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const columns = [
    'ALTER TABLE vehicles ADD COLUMN invoice_number VARCHAR(100) NULL',
    'ALTER TABLE vehicles ADD COLUMN license_plate VARCHAR(64) NULL',
    'ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(255) NULL',
    'ALTER TABLE vehicles ADD COLUMN phone VARCHAR(64) NULL',
    'ALTER TABLE vehicles ADD COLUMN brand VARCHAR(128) NULL',
    'ALTER TABLE vehicles ADD COLUMN model VARCHAR(256) NULL',
    'ALTER TABLE vehicles ADD COLUMN color VARCHAR(128) NULL',
    'ALTER TABLE vehicles ADD COLUMN vin VARCHAR(128) NULL',
    'ALTER TABLE vehicles ADD COLUMN mileage INT NULL',
    "ALTER TABLE vehicles MODIFY COLUMN status VARCHAR(64) NULL DEFAULT 'จองคิว'",
    'ALTER TABLE vehicles ADD COLUMN repair_cost DECIMAL(12,2) NULL DEFAULT 0',
    'ALTER TABLE vehicles ADD COLUMN booking_date DATE NULL',
    'ALTER TABLE vehicles ADD COLUMN booking_time TIME NULL',
    'ALTER TABLE vehicles ADD COLUMN estimated_completion_date DATE NULL',
    'ALTER TABLE vehicles ADD COLUMN status_detail TEXT NULL',
    'ALTER TABLE vehicles ADD COLUMN receipt_image MEDIUMTEXT NULL',
    'ALTER TABLE vehicles ADD COLUMN receipt_images MEDIUMTEXT NULL',
    'ALTER TABLE vehicles ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE vehicles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  ];

  for (const sql of columns) await ensureColumn(sql);

  await query(`
    UPDATE vehicles SET
      status = CASE
        WHEN status IN ('1', 'จองคิว') THEN 'จองคิว'
        WHEN status IN ('2', 'เช็ครถ', 'กำลังตรวจเช็ค') THEN 'กำลังตรวจเช็ค'
        WHEN status IN ('3', 'รออะไหล่') THEN 'รออะไหล่'
        WHEN status IN ('4', 'กำลังซ่อม') THEN 'กำลังซ่อม'
        WHEN status IN ('5', 'ซ่อมเสร็จรอส่ง') THEN 'ซ่อมเสร็จรอส่ง'
        WHEN status IN ('6', 'ปิดงาน') THEN 'ปิดงาน'
        ELSE COALESCE(NULLIF(status, ''), 'จองคิว')
      END,
      repair_cost = COALESCE(repair_cost, 0)
  `);

  await ensureIndex('CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate)');
  await ensureIndex('CREATE INDEX idx_vehicles_phone ON vehicles(phone)');
  await ensureIndex('CREATE INDEX idx_vehicles_invoice_number ON vehicles(invoice_number)');
  await ensureIndex('CREATE INDEX idx_vehicles_status ON vehicles(status)');
  await ensureIndex('CREATE INDEX idx_vehicles_booking_date ON vehicles(booking_date)');
  await ensureIndex('CREATE INDEX idx_vehicles_vin ON vehicles(vin)');
}

function normalizeRow(row) {
  return {
    id: row.id,
    invoice_number: row.invoice_number || null,
    license_plate: row.license_plate || null,
    owner_name: row.owner_name || null,
    phone: row.phone || null,
    brand: row.brand || null,
    model: row.model || null,
    color: row.color || null,
    vin: row.vin || null,
    mileage: normalizeMileage(row.mileage),
    status: normalizeStatus(row.status),
    repair_cost: normalizeMoney(row.repair_cost),
    booking_date: formatSqlDate(row.booking_date),
    booking_time: formatSqlTime(row.booking_time),
    estimated_completion_date: formatSqlDate(row.estimated_completion_date),
    status_detail: row.status_detail || null,
    receipt_image: row.receipt_image || null,
    receipt_images: cleanReceiptImages(row.receipt_images),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function normalizePublicRow(row) {
  const normalized = normalizeRow(row);
  return {
    id: normalized.id,
    status: normalized.status,
  };
}

function cleanReceiptImage(value) {
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

function parseReceiptImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanReceiptImages(value) {
  return Array.from(new Set(parseReceiptImages(value).map(cleanReceiptImage).filter(Boolean))).slice(0, 20);
}

function normalizeVehicleBody(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' };
  const receiptImage = cleanReceiptImage(body.receipt_image);
  const receiptImages = cleanReceiptImages(body.receipt_images);
  const mergedReceiptImages = Array.from(new Set([receiptImage, ...receiptImages].filter(Boolean)));
  const bookingTime = cleanTime(body.booking_time ?? body.bookingTime);
  if (bookingTime.error) return { error: bookingTime.error };

  return {
    vehicle: {
      id: cleanString(body.id, 64) || `job-${Date.now()}`,
      invoice_number: cleanNullable(body.invoice_number, 100),
      license_plate: cleanNullable(body.license_plate, 64),
      owner_name: cleanNullable(body.owner_name, 255),
      phone: cleanNullable(body.phone, 64),
      brand: cleanNullable(body.brand, 128),
      model: cleanNullable(body.model, 256),
      color: cleanNullable(body.color, 128),
      vin: cleanNullable(body.vin, 128),
      mileage: normalizeMileage(body.mileage),
      status: normalizeStatus(body.status),
      repair_cost: normalizeMoney(body.repair_cost),
      booking_date: cleanDate(body.booking_date),
      booking_time: bookingTime.value,
      estimated_completion_date: cleanDate(body.estimated_completion_date),
      status_detail: cleanNullable(body.status_detail, 2000),
      receipt_image: mergedReceiptImages[0] || null,
      receipt_images: mergedReceiptImages,
    },
  };
}

function getDateKey(row) {
  return row.booking_date || row.estimated_completion_date || formatSqlDate(row.created_at) || '';
}

function aggregateRows(rows, period, mode) {
  const map = new Map();
  for (const row of rows) {
    const date = getDateKey(row);
    const key = period === 'year' ? date.slice(0, 4) : period === 'day' ? date.slice(0, 10) : date.slice(0, 7);
    if (!key) continue;
    const current = map.get(key) || { label: key, revenue: 0, cars: 0 };
    if (mode === 'revenue' && row.status === FINAL_STATUS) current.revenue += normalizeMoney(row.repair_cost);
    if (mode === 'in_shop' && row.status !== CLOSED_STATUS) current.cars += 1;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

function buildDateWhere(url) {
  const params = [];
  const where = [];
  const day = cleanString(url.searchParams.get('day'), 2);
  const month = cleanString(url.searchParams.get('month'), 2);
  const year = cleanString(url.searchParams.get('year'), 4);
  const dateExpression = 'COALESCE(booking_date, estimated_completion_date, created_at)';

  if (/^\d{4}$/.test(year)) {
    where.push(`YEAR(${dateExpression}) = ?`);
    params.push(year);
  }
  if (/^\d{2}$/.test(month)) {
    where.push(`MONTH(${dateExpression}) = ?`);
    params.push(month);
  }
  if (/^\d{2}$/.test(day)) {
    where.push(`DAY(${dateExpression}) = ?`);
    params.push(day);
  }

  return { clause: where.length ? ` AND ${where.join(' AND ')}` : '', params };
}

async function saveReceiptImage(base64Data, id) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return base64Data;
  const result = await cloudinary.uploader.upload(base64Data, {
    folder: 'jbm-pro-auto/receipts',
    public_id: `vehicle-${id}-${Date.now()}`,
  });
  return result.secure_url;
}

async function saveReceiptImages(images, id) {
  const saved = [];
  for (const [index, image] of images.entries()) {
    if (image?.startsWith('data:image/')) {
      saved.push(await saveReceiptImage(image, `${id}-${index + 1}`));
    } else if (image) {
      saved.push(image);
    }
  }
  return Array.from(new Set(saved));
}

export async function GET(request) {
  try {
    await ensureVehiclesTable();
    const url = new URL(request.url);
    const wantsAdminData = url.searchParams.get('admin') === '1';
    const wantsSummary = url.searchParams.get('summary') === '1';
    const wantsInShop = url.searchParams.get('in_shop') === '1';
    const status = cleanString(url.searchParams.get('status'), 64);

    if ((wantsAdminData || wantsSummary || wantsInShop || status) && !(await isAuthorizedAdminRequest(request))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (wantsSummary) {
      const rows = (await query('SELECT * FROM vehicles ORDER BY COALESCE(booking_date, estimated_completion_date, created_at) ASC LIMIT 5000')).map(normalizeRow);
      const today = new Date().toISOString().slice(0, 10);
      const month = today.slice(0, 7);
      const year = today.slice(0, 4);
      const finalRows = rows.filter((row) => row.status === FINAL_STATUS);
      const inShopRows = rows.filter((row) => row.status !== CLOSED_STATUS);
      const revenueFor = (prefix) => finalRows
        .filter((row) => getDateKey(row).startsWith(prefix))
        .reduce((sum, row) => sum + normalizeMoney(row.repair_cost), 0);

      return json({
        statuses: STATUS_OPTIONS,
        totals: {
          all: rows.length,
          booking: rows.filter((row) => row.status === DEFAULT_STATUS).length,
          checking: rows.filter((row) => row.status === 'กำลังตรวจเช็ค').length,
          repairing: rows.filter((row) => row.status === 'กำลังซ่อม').length,
          in_shop: inShopRows.length,
          ready_to_deliver: finalRows.length,
          revenue_today: revenueFor(today),
          revenue_month: revenueFor(month),
          revenue_year: revenueFor(year),
        },
        revenue: aggregateRows(finalRows, url.searchParams.get('period') || 'month', 'revenue'),
        in_shop_chart: aggregateRows(inShopRows, url.searchParams.get('period') || 'month', 'in_shop'),
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (wantsAdminData || wantsInShop || status) {
      const dateWhere = buildDateWhere(url);
      const filters = [];
      const params = [];
      if (wantsInShop) {
        filters.push('status <> ?');
        params.push(CLOSED_STATUS);
      }
      if (status) {
        filters.push('status = ?');
        params.push(normalizeStatus(status));
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : 'WHERE 1=1';
      const rows = await query(
        `SELECT * FROM vehicles ${where}${dateWhere.clause}
         ORDER BY COALESCE(booking_date, estimated_completion_date, created_at) DESC, created_at DESC LIMIT 1000`,
        [...params, ...dateWhere.params]
      );
      return json(rows.map(normalizeRow), { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const search = cleanString(url.searchParams.get('search'), 100);
    if (!search) return json([], { status: 200, headers: { 'Cache-Control': 'no-store' } });

    const phoneSearch = search.replace(/[^0-9]/g, '');
    const likeSearch = `%${search.toLowerCase()}%`;
    const rows = await query(
      `SELECT * FROM vehicles
       WHERE LOWER(COALESCE(invoice_number, '')) LIKE ?
          OR LOWER(COALESCE(license_plate, '')) LIKE ?
          OR LOWER(COALESCE(owner_name, '')) LIKE ?
          OR LOWER(COALESCE(vin, '')) LIKE ?
          OR (? <> '' AND REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), '-', ''), ' ', ''), '.', '') LIKE ?)
       ORDER BY COALESCE(booking_date, estimated_completion_date, created_at) DESC, created_at DESC
       LIMIT 10`,
      [likeSearch, likeSearch, likeSearch, likeSearch, phoneSearch, `%${phoneSearch}%`]
    );

    return json(rows.map(normalizePublicRow), { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[vehicles] GET failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    if (getContentLength(request) > MAX_REQUEST_BYTES) return json({ error: 'Request body too large' }, { status: 413 });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const normalized = normalizeVehicleBody(body);
    if (normalized.error) return json({ error: normalized.error }, { status: 400 });
    const { vehicle } = normalized;

    vehicle.receipt_images = await saveReceiptImages(vehicle.receipt_images, vehicle.id);
    vehicle.receipt_image = vehicle.receipt_images[0] || vehicle.receipt_image || null;

    await ensureVehiclesTable();
    const beforeRows = await query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [vehicle.id]);
    const beforeVehicle = Array.isArray(beforeRows) && beforeRows.length ? normalizeRow(beforeRows[0]) : null;
    await query(
      `INSERT INTO vehicles (
        id, invoice_number, license_plate, owner_name, phone, brand, model, color, vin, mileage,
        status, repair_cost, booking_date, booking_time, estimated_completion_date, status_detail, receipt_image, receipt_images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        repair_cost = VALUES(repair_cost),
        booking_date = VALUES(booking_date),
        booking_time = VALUES(booking_time),
        estimated_completion_date = VALUES(estimated_completion_date),
        status_detail = VALUES(status_detail),
        receipt_image = VALUES(receipt_image),
        receipt_images = VALUES(receipt_images)`,
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
        vehicle.repair_cost,
        vehicle.booking_date,
        vehicle.booking_time,
        vehicle.estimated_completion_date,
        vehicle.status_detail,
        vehicle.receipt_image,
        JSON.stringify(vehicle.receipt_images),
      ]
    );

    const savedRows = await query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [vehicle.id]);
    const savedVehicle = normalizeRow(savedRows[0] || vehicle);
    await insertAuditLogSafe({
      action: beforeVehicle ? 'UPDATE' : 'CREATE',
      module: 'VEHICLE',
      entityType: 'VEHICLE',
      entityId: savedVehicle.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: savedVehicle.invoice_number || savedVehicle.license_plate || savedVehicle.id,
        beforeData: beforeVehicle,
        afterData: savedVehicle,
      },
    });

    return json({ success: true, vehicle: savedVehicle }, { status: 200 });
  } catch (error) {
    console.error('[vehicles] POST failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    await ensureVehiclesTable();
    const rows = await query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
    const previousVehicle = Array.isArray(rows) && rows.length ? normalizeRow(rows[0]) : null;
    await query('DELETE FROM vehicles WHERE id = ?', [id]);
    if (previousVehicle) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'VEHICLE',
        entityType: 'VEHICLE',
        entityId: previousVehicle.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: previousVehicle.invoice_number || previousVehicle.license_plate || previousVehicle.id,
          beforeData: previousVehicle,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[vehicles] DELETE failed', error);
    return json({ error: 'Vehicle service unavailable' }, { status: 503 });
  }
}

