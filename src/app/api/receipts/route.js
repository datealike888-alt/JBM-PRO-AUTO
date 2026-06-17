import { isAuthorizedAdminRequest } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

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

async function ensureVehicleReceiptsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vehicle_receipts (
      id VARCHAR(64) PRIMARY KEY,
      vehicle_id VARCHAR(64) NOT NULL,
      file_name VARCHAR(255) NULL,
      file_url TEXT NULL,
      mime_type VARCHAR(100) NULL,
      file_size INT NULL,
      uploaded_by VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vehicle_receipts_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function GET(request) {
  try {
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureVehicleReceiptsTable();
    const vehicleId = cleanString(new URL(request.url).searchParams.get('vehicleId'), 64);
    const rows = await query(
      `SELECT * FROM vehicle_receipts ${vehicleId ? 'WHERE vehicle_id = ?' : ''} ORDER BY created_at DESC`,
      vehicleId ? [vehicleId] : []
    );
    return json({ success: true, receipts: rows }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[receipts] GET failed', error);
    return json({ error: 'Receipt service unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureVehicleReceiptsTable();
    const body = await request.json();
    const id = cleanString(body.id, 64) || `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const vehicleId = cleanString(body.vehicle_id || body.vehicleId, 64);
    if (!vehicleId) return json({ error: 'vehicleId is required' }, { status: 400 });
    await query(
      `INSERT INTO vehicle_receipts (id, vehicle_id, file_name, file_url, mime_type, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         file_name = VALUES(file_name),
         file_url = VALUES(file_url),
         mime_type = VALUES(mime_type),
         file_size = VALUES(file_size),
         uploaded_by = VALUES(uploaded_by)`,
      [
        id,
        vehicleId,
        cleanString(body.file_name || body.fileName, 255) || null,
        cleanString(body.file_url || body.fileUrl, 1000000) || null,
        cleanString(body.mime_type || body.mimeType, 100) || null,
        Number(body.file_size || body.fileSize || 0) || null,
        cleanString(body.uploaded_by || body.uploadedBy, 100) || null,
      ]
    );
    const rows = await query('SELECT * FROM vehicle_receipts WHERE id = ? LIMIT 1', [id]);
    return json({ success: true, receipt: rows[0] || null }, { status: 200 });
  } catch (error) {
    console.error('[receipts] POST failed', error);
    return json({ error: 'Unable to save receipt' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureVehicleReceiptsTable();
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    await query('DELETE FROM vehicle_receipts WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[receipts] DELETE failed', error);
    return json({ error: 'Unable to delete receipt' }, { status: 503 });
  }
}

