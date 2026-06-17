import {
  createAdminSession,
  ensureAdminUsersTable,
  getAuthorizedAdminFromRequest,
  validateAdminCredentials,
} from '../../../../lib/adminAuth';
import { SESSION_COOKIE_NAME } from '../../../../lib/session';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

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

function buildSessionCookie(token) {
  const secure = String(process.env.SESSION_COOKIE_SECURE || 'false').toLowerCase() === 'true';
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ].filter(Boolean).join('; ');
}

export async function GET(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ authenticated: false }, { status: 401 });
    return json({
      authenticated: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
      },
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/validate] GET failed', error);
    return json({ authenticated: false }, { status: 401 });
  }
}

export async function POST(request) {
  if (getContentLength(request) > MAX_REQUEST_BYTES) {
    return json({ error: 'Request body too large' }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) {
    return json({ error: 'Username and password are required' }, { status: 400 });
  }

  try {
    await ensureAdminUsersTable();
    const admin = await validateAdminCredentials(username, password);
    if (!admin) return json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 403 });

    const token = await createAdminSession(admin);
    return json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
      },
    }, {
      status: 200,
      headers: {
        'Set-Cookie': buildSessionCookie(token),
      },
    });
  } catch (error) {
    console.error('[admin/validate] POST failed', error);
    return json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 403 });
  }
}
