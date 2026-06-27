import { requirePermission, updateAdminUser, deleteAdminUser, ensureDefaultRolesAndPermissions } from '../../../../../lib/adminPermissions';
import { query } from '../../../../../lib/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request, { params }) {
  try {
    const auth = await requirePermission(request, 'adminUsers.view');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!id) return json({ error: 'Missing user ID' }, { status: 400 });

    await ensureDefaultRolesAndPermissions();

    const rows = await query(
      `SELECT id, username, display_name, email, is_active, created_at, updated_at, last_login_at
       FROM admin_users WHERE id = ? LIMIT 1`,
      [String(id)]
    );
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!user) return json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });

    const roleRows = await query(
      `SELECT r.id, r.role_key, r.role_name
       FROM admin_user_roles ur
       JOIN admin_roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [String(id)]
    );

    return json({
      user: {
        id: String(user.id),
        username: user.username,
        display_name: user.display_name || '',
        email: user.email || '',
        is_active: Number(user.is_active) === 1,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
        roles: Array.isArray(roleRows) ? roleRows.map((r) => ({ id: r.id, key: r.role_key, name: r.role_name })) : [],
      },
    });
  } catch (error) {
    console.error('[admin/users/[id]] GET failed', error);
    return json({ error: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requirePermission(request, 'adminUsers.update');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!id) return json({ error: 'Missing user ID' }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (body.is_active === false && auth.admin?.id === id) {
      return json({ error: 'ไม่สามารถปิดใช้งานบัญชีที่กำลังใช้งานอยู่ได้' }, { status: 400 });
    }

    if (body.role_ids && !body.roleIds) {
      body.roleIds = body.role_ids;
    }

    await ensureDefaultRolesAndPermissions();
    await updateAdminUser(id, body);
    return json({ success: true });
  } catch (error) {
    console.error('[admin/users/[id]] PUT failed', error);
    const message = error?.message || 'แก้ไขผู้ใช้ไม่สำเร็จ';
    return json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requirePermission(request, 'adminUsers.delete');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!id) return json({ error: 'Missing user ID' }, { status: 400 });

    await ensureDefaultRolesAndPermissions();
    await deleteAdminUser(id);
    return json({ success: true });
  } catch (error) {
    console.error('[admin/users/[id]] DELETE failed', error);
    const message = error?.message || 'ลบผู้ใช้ไม่สำเร็จ';
    return json({ error: message }, { status: 400 });
  }
}
