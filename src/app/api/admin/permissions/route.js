import { requirePermission, listAllPermissions } from '../../../../lib/adminPermissions';

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

    const permissions = await listAllPermissions();

    // Group permissions by group_name
    const grouped = {};
    for (const perm of permissions) {
      const group = perm.group || 'อื่นๆ';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(perm);
    }

    return json({ permissions, grouped }, { status: 200 });
  } catch (error) {
    console.error('[admin/permissions] GET failed', error);
    return json({ error: 'ไม่สามารถโหลดรายการสิทธิ์ได้' }, { status: 500 });
  }
}
