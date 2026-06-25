import { requirePermission, listRoles } from '../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request) {
  try {
    const auth = await requirePermission(request, 'roles.view');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const roles = await listRoles();
    return json({ roles }, { status: 200 });
  } catch (error) {
    console.error('[admin/roles] GET failed', error);
    return json({ error: 'ไม่สามารถโหลดรายชื่อยศได้' }, { status: 500 });
  }
}
