import fs from 'fs/promises';
import path from 'path';

const MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const FILENAME_RE = /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gif)$/i;

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const filename = decodeURIComponent(String(resolvedParams?.filename || ''));
  if (!FILENAME_RE.test(filename)) {
    return new Response(JSON.stringify({ error: 'Invalid filename' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const receiptsDir = path.resolve(process.cwd(), 'public', 'uploads', 'receipts');
  const filePath = path.join(receiptsDir, filename);
  if (!filePath.startsWith(receiptsDir + path.sep)) {
    return new Response(JSON.stringify({ error: 'Invalid filename' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
