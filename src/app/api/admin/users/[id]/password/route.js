import { requirePermission, changeAdminPassword } from '../../../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function PUT(request, { params }) {
  try {
    const auth = await requirePermission(request, 'adminUsers.password');
    if (auth.error) return json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!id) return json({ error: 'Missing user ID' }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { password, confirm_password } = body || {};
    if (!password) {
      return json({ error: 'กรุณากรอกรหัสผ่านใหม่' }, { status: 400 });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return json({ error: 'รหัสผ่านไม่ตรงกัน' }, { status: 400 });
    }

    await changeAdminPassword(id, password);
    return json({ success: true });
  } catch (error) {
    console.error('[admin/users/[id]/password] PUT failed', error);
    return json({ error: error?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }, { status: 400 });
  }
}
