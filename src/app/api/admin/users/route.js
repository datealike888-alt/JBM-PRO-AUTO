import { requireAnyPermission, requirePermission } from '../../../../lib/adminPermissions';
import { listAdminUsers, createAdminUser, ensureDefaultRolesAndPermissions } from '../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request) {
  try {
    const auth = await requireAnyPermission(request, ['adminUsers.view', 'roles.view']);
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const users = await listAdminUsers();
    return json({ users }, { status: 200 });
  } catch (error) {
    console.error('[admin/users] GET failed', error);
    return json({ error: 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requirePermission(request, 'adminUsers.create');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { username, password, confirm_password, display_name, email, role_ids, roleIds, is_active } = body || {};

    if (!username || !password) {
      return json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return json({ error: 'รหัสผ่านไม่ตรงกัน' }, { status: 400 });
    }

    await ensureDefaultRolesAndPermissions();

    const finalRoleIds = Array.isArray(role_ids) ? role_ids : (Array.isArray(roleIds) ? roleIds : []);

    const userId = await createAdminUser({
      username,
      password,
      display_name: display_name || '',
      email: email || '',
      roleIds: finalRoleIds,
      is_active: is_active !== false,
    });

    return json({ success: true, userId }, { status: 201 });
  } catch (error) {
    console.error('[admin/users] POST failed', error);
    const message = error?.message || 'สร้างบัญชีผู้ใช้ไม่สำเร็จ';
    return json({ error: message }, { status: 400 });
  }
}
