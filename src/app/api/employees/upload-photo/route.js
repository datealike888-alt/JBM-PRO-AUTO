import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getAuthorizedAdminFromRequest } from '../../../../lib/adminAuth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function cleanSegment(value, fallback = 'employee') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || fallback;
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('photo');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ error: 'กรุณาเลือกไฟล์รูปพนักงาน' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP' }, { status: 400 });
    }
    if (Number(file.size || 0) > MAX_PHOTO_BYTES) {
      return json({ error: 'ไฟล์รูปพนักงานต้องไม่เกิน 5MB' }, { status: 413 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'employees');
    await fs.mkdir(uploadsDir, { recursive: true });

    const extension = ALLOWED_TYPES.get(file.type);
    const employeeId = cleanSegment(formData.get('employeeId'));
    const random = crypto.randomBytes(8).toString('hex');
    const filename = `${employeeId}-${Date.now()}-${random}.${extension}`;
    const filePath = path.join(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir + path.sep)) {
      return json({ error: 'Invalid upload path' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, bytes);

    return json({ success: true, url: `/uploads/employees/${filename}` }, { status: 200 });
  } catch (error) {
    console.error('[employees/upload-photo] POST failed', error);
    return json({ error: 'อัปโหลดรูปพนักงานไม่สำเร็จ' }, { status: 500 });
  }
}
