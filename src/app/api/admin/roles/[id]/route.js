import { requirePermission, getRoleWithPermissions, updateRolePermissions } from '../../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request, { params }) {
  try {
    const auth = await requirePermission(request, 'roles.view');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!id) return json({ error: 'Missing role ID' }, { status: 400 });

    const role = await getRoleWithPermissions(id);
    if (!role) return json({ error: 'ไม่พบยศ' }, { status: 404 });

    return json({ role });
  } catch (error) {
    console.error('[admin/roles/[id]] GET failed', error);
    return json({ error: 'ไม่สามารถโหลดข้อมูลยศได้' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requirePermission(request, 'roles.update');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!id) return json({ error: 'Missing role ID' }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { permissionIds } = body || {};
    if (!Array.isArray(permissionIds)) {
      return json({ error: 'กรุณาส่ง permissionIds เป็น array' }, { status: 400 });
    }

    await updateRolePermissions(id, permissionIds);
    return json({ success: true });
  } catch (error) {
    console.error('[admin/roles/[id]] PUT failed', error);
    return json({ error: error?.message || 'แก้ไขสิทธิ์ไม่สำเร็จ' }, { status: 400 });
  }
}
