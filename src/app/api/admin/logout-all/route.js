import { getAuthorizedAdminFromRequest, revokeAllAdminSessions } from '../../../../lib/adminAuth';
import { SESSION_COOKIE_NAME } from '../../../../lib/session';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin?.id) return json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

    const revoked = await revokeAllAdminSessions(admin.id);
    return json({ success: true, revoked }, {
      status: 200,
      headers: {
        'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    });
  } catch (error) {
    console.error('[admin/logout-all] POST failed', error);
    return json({ error: 'Unable to logout all devices' }, { status: 503 });
  }
}
