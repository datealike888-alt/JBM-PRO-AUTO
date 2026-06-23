import fs from 'fs/promises';
import path from 'path';
import { getAuthorizedAdminFromRequest } from '../../../../lib/adminAuth';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

function json(data, init = {}) {
  return Response.json(data, init);
}

function safeSegment(value, fallback = 'receipt') {
  const text = String(value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return (text || fallback).slice(0, 48);
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('receipt');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return json({ error: 'receipt file is required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: 'Only jpg, png, webp, or gif receipts are supported' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return json({ error: 'Receipt image is too large' }, { status: 413 });
    }

    const ext = ALLOWED_TYPES.get(file.type);
    const scope = safeSegment(formData.get('scope'), 'financial');
    const name = `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const receiptsDir = path.resolve(process.cwd(), 'public', 'uploads', 'receipts');
    await fs.mkdir(receiptsDir, { recursive: true });
    await fs.writeFile(path.join(receiptsDir, name), Buffer.from(await file.arrayBuffer()));

    return json({
      success: true,
      filename: name,
      url: `/uploads/receipts/${name}`,
    }, { status: 200 });
  } catch (error) {
    console.error('[financial-transactions/upload-receipt] POST failed', error);
    return json({ error: 'Unable to upload receipt' }, { status: 503 });
  }
}
