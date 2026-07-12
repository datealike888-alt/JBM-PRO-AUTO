import {
  createAdminSession,
  getAuthorizedAdminFromRequest,
  validateAdminCredentials,
} from '../../../../lib/adminAuth';
import { ensureDefaultRolesAndPermissions, getAdminUserWithPermissions } from '../../../../lib/adminPermissions';
import { SESSION_COOKIE_NAME } from '../../../../lib/session';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function errorJson(error, fallbackStatus = 500) {
  if (error?.code === 'DATABASE_CONFIGURATION_ERROR') {
    return json({
      success: false,
      authenticated: false,
      error: 'ระบบฐานข้อมูลยังไม่พร้อม กรุณาตรวจสอบการตั้งค่าเซิร์ฟเวอร์',
      code: 'DATABASE_CONFIGURATION_ERROR',
    }, { status: 503 });
  }

  if (error?.code === 'SESSION_CONFIGURATION_ERROR') {
    return json({
      success: false,
      authenticated: false,
      error: 'ระบบยืนยันตัวตนยังไม่พร้อม กรุณาตรวจสอบการตั้งค่าเซิร์ฟเวอร์',
      code: 'SESSION_CONFIGURATION_ERROR',
    }, { status: 503 });
  }

  if (error?.code === 'ADMIN_AUTH_SCHEMA_NOT_READY') {
    return json({
      success: false,
      authenticated: false,
      error: 'ระบบผู้ดูแลยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      code: 'ADMIN_AUTH_SCHEMA_NOT_READY',
    }, { status: 503 });
  }

  return json({
    success: false,
    authenticated: false,
    error: fallbackStatus >= 500
      ? 'ระบบเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      : 'ไม่สามารถดำเนินการได้',
    code: 'UNEXPECTED_ERROR',
  }, { status: fallbackStatus });
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

async function loadUserPermissions(adminId) {
  try {
    await ensureDefaultRolesAndPermissions();
    const data = await getAdminUserWithPermissions(adminId);
    return {
      roles: data?.roles || [],
      roleKeys: data?.roleKeys || [],
      permissions: data?.permissions || [],
    };
  } catch (error) {
    console.error('[admin/validate] loadUserPermissions failed', error);
    return { roles: [], roleKeys: [], permissions: [] };
  }
}

export async function GET(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ success: false, authenticated: false, error: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });

    const { roles, roleKeys, permissions } = await loadUserPermissions(admin.id);

    return json({
      success: true,
      authenticated: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
        roles,
        roleKeys,
        permissions,
      },
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/validate] GET failed', { code: error?.code || 'UNEXPECTED_ERROR' });
    return errorJson(error, 500);
  }
}

export async function POST(request) {
  if (getContentLength(request) > MAX_REQUEST_BYTES) {
    return json({ success: false, error: 'Request body too large' }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) {
    return json({ success: false, error: 'Username and password are required' }, { status: 400 });
  }

  try {
    const admin = await validateAdminCredentials(username, password);
    if (!admin) {
      return json({ success: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const { roles, roleKeys, permissions } = await loadUserPermissions(admin.id);
    const token = await createAdminSession(admin);

    return json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
        roles,
        roleKeys,
        permissions,
      },
    }, {
      status: 200,
      headers: {
        'Set-Cookie': buildSessionCookie(token),
      },
    });
  } catch (error) {
    console.error('[admin/validate] POST failed', { code: error?.code || 'UNEXPECTED_ERROR' });
    return errorJson(error, 500);
  }
}
