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
  ['image/gif', 'gif'],
]);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'ไม่มีสิทธิ์อัปโหลดรูปภาพ' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('receipt');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ error: 'กรุณาเลือกไฟล์รูปบิล/สลิป' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ GIF' }, { status: 400 });
    }
    if (Number(file.size || 0) > MAX_PHOTO_BYTES) {
      return json({ error: 'ไฟล์รูปต้องไม่เกิน 5MB' }, { status: 413 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'receipts');
    await fs.mkdir(uploadsDir, { recursive: true });

    const extension = ALLOWED_TYPES.get(file.type);
    const random = crypto.randomBytes(8).toString('hex');
    const filename = `cr-${Date.now()}-${random}.${extension}`;
    const filePath = path.join(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir + path.sep)) {
      return json({ error: 'Invalid upload path' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, bytes);

    return json({ success: true, url: `/uploads/receipts/${filename}` }, { status: 200 });
  } catch (error) {
    console.error('[cash-reserve/upload-receipt] POST failed', error);
    return json({ error: 'อัปโหลดรูปล้มเหลว' }, { status: 500 });
  }
}
