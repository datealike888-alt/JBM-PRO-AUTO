import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getAuthorizedAdminFromRequest } from '../../../../../lib/adminAuth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
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

function cleanSegment(value, fallback = 'stock-product') {
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
    const file = formData.get('image') || formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ error: 'กรุณาเลือกไฟล์รูปสินค้า' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP' }, { status: 400 });
    }
    if (Number(file.size || 0) > MAX_IMAGE_BYTES) {
      return json({ error: 'ไฟล์รูปสินค้าต้องไม่เกิน 5MB' }, { status: 413 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'stock');
    await fs.mkdir(uploadsDir, { recursive: true });

    const extension = ALLOWED_TYPES.get(file.type);
    const productId = cleanSegment(formData.get('productId') || formData.get('code'));
    const random = crypto.randomBytes(8).toString('hex');
    const filename = `${productId}-${Date.now()}-${random}.${extension}`;
    const filePath = path.join(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir + path.sep)) {
      return json({ error: 'Invalid upload path' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, bytes);

    return json({ success: true, url: `/uploads/stock/${filename}` }, { status: 200 });
  } catch (error) {
    console.error('[stock/products/upload-image] POST failed', error);
    return json({ error: 'อัปโหลดรูปสินค้าไม่สำเร็จ' }, { status: 500 });
  }
}
