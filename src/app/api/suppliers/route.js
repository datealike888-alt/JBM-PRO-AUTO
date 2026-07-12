import { requireAnyPermission, requirePermission } from '../../../lib/adminPermissions';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import {
  cleanString,
  deleteSupplierPayable,
  getSupplierPayableById,
  getSupplierPayables,
  saveSupplierPayable,
  SUPPLIER_STATUS_PAID,
  SUPPLIER_STATUS_PENDING,
} from '../../../lib/supplierPayableStorage';
import { assertSchemaReady, handleSchemaError } from '../../../lib/schemaReadiness';

function json(data, init = {}) {
  return Response.json(data, init);
}

function buildSummary(payables) {
  const pendingRows = payables.filter((item) => item.status === SUPPLIER_STATUS_PENDING);
  const paidRows = payables.filter((item) => item.status === SUPPLIER_STATUS_PAID);
  return {
    pending_company_count: new Set(pendingRows.map((item) => item.company_name.trim().toLowerCase()).filter(Boolean)).size,
    pending_total: pendingRows.reduce((sum, item) => sum + Number(item.outstanding_amount || 0), 0),
    pending_count: pendingRows.length,
    paid_count: paidRows.length,
  };
}

export async function GET(request) {
  try {
    const authResult = await requireAnyPermission(request, ['finance.view', 'dashboard.all']);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });

    await assertSchemaReady('financial');
    const url = new URL(request.url);
    const id = cleanString(url.searchParams.get('id'), 64);
    if (id) {
      const supplier = await getSupplierPayableById(id);
      if (!supplier) return json({ error: 'ไม่พบรายการซัพพลายเออร์' }, { status: 404 });
      return json({ success: true, supplier }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const suppliers = await getSupplierPayables({
      search: url.searchParams.get('search'),
      status: url.searchParams.get('status'),
    });
    return json({ success: true, suppliers, summary: buildSummary(suppliers) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[suppliers] GET failed', error);
    return json({ error: 'โหลดข้อมูลซัพพลายเออร์ไม่สำเร็จ' }, { status: 503 });
  }
}

async function save(request, permission = 'finance.create') {
  try {
    const authResult = await requirePermission(request, permission);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
    }

    await assertSchemaReady('financial');
    const before = body?.id ? await getSupplierPayableById(body.id) : null;
    const supplier = await saveSupplierPayable(body, admin);
    if (supplier.error) return json({ error: supplier.error }, { status: 400 });

    await insertAuditLogSafe({
      action: before ? 'UPDATE' : 'CREATE',
      module: 'FINANCIAL',
      entityType: 'SUPPLIER_PAYABLE',
      entityId: supplier.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: supplier.company_name || supplier.id,
        beforeData: before,
        afterData: supplier,
      },
    });

    return json({ success: true, supplier }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[suppliers] save failed', error);
    return json({ error: 'บันทึกรายการซัพพลายเออร์ไม่สำเร็จ' }, { status: 503 });
  }
}

export async function POST(request) {
  return save(request, 'finance.create');
}

export async function PUT(request) {
  return save(request, 'finance.update');
}

export async function PATCH(request) {
  return save(request, 'finance.update');
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'finance.delete');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'กรุณาระบุ id ของรายการที่ต้องการลบ' }, { status: 400 });

    await assertSchemaReady('financial');

    const supplier = await deleteSupplierPayable(id);
    if (supplier.error) return json({ error: supplier.error }, { status: 404 });

    await insertAuditLogSafe({
      action: 'DELETE',
      module: 'FINANCIAL',
      entityType: 'SUPPLIER_PAYABLE',
      entityId: supplier.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: supplier.company_name || supplier.id,
        beforeData: supplier,
        afterData: null,
      },
    });

    return json({ success: true }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[suppliers] DELETE failed', error);
    return json({ error: 'ลบรายการซัพพลายเออร์ไม่สำเร็จ' }, { status: 503 });
  }
}
