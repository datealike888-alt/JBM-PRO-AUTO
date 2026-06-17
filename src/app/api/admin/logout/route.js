import { getAdminTokenFromRequest, revokeAdminSession } from '../../../../lib/adminAuth';
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
    const token = getAdminTokenFromRequest(request);
    await revokeAdminSession(token);
    return json({ success: true }, {
      status: 200,
      headers: {
        'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    });
  } catch (error) {
    console.error('[admin/logout] POST failed', error);
    return json({ error: 'Unable to logout' }, { status: 503 });
  }
}
