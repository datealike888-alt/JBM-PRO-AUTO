import {
  ensureStockMovementsTable,
  query,
} from '../../../../../lib/stockStorage';
import { getAuthorizedAdminFromRequest } from '../../../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../../../lib/auditLog';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function DELETE(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    if (body.confirmText !== 'TEST') {
      return json({ error: 'Invalid confirmation text' }, { status: 400 });
    }

    await ensureStockMovementsTable();

    // Safely match TEST rows
    const testCondition = "product_code LIKE 'TEST-%' OR product_name LIKE 'TEST-%' OR note LIKE '%TEST%' OR created_by LIKE 'TEST-%'";

    const countRows = await query(`SELECT COUNT(*) as count FROM stock_movements WHERE ${testCondition}`);
    const deleteCount = countRows[0]?.count || 0;

    if (deleteCount > 0) {
      await query(`DELETE FROM stock_movements WHERE ${testCondition}`);

      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'STOCK',
        entityType: 'STOCK_MOVEMENT',
        entityId: 'TEST-BULK',
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: 'Bulk delete TEST stock movements',
          beforeData: { count: deleteCount },
          afterData: null,
        },
      });
    }

    return json({ success: true, deleted: deleteCount }, { status: 200 });
  } catch (error) {
    console.error('[stock/movements/test-only] DELETE failed', error);
    return json({ error: 'Unable to delete TEST stock movements' }, { status: 503 });
  }
}
