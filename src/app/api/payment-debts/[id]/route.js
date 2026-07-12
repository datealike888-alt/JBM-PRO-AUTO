import { getAuthorizedAdminFromRequest } from '../../../../lib/adminAuth';
import { query } from '../../../../lib/db';
import { insertAuditLogSafe } from '../../../../lib/auditLog';
import { assertSchemaReady, handleSchemaError } from '../../../../lib/schemaReadiness';

function json(data, init = {}) {
  return Response.json(data, init);
}

export async function DELETE(request, { params }) {
  try {
    const adminUser = await getAuthorizedAdminFromRequest(request);
    if (!adminUser) return json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams?.id;
    if (!id) return json({ error: 'Missing ID' }, { status: 400 });

    await assertSchemaReady('financial');

    const rows = await query('SELECT * FROM payment_debts WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      return json({ error: 'Debt not found' }, { status: 404 });
    }

    const debt = rows[0];

    const paymentRows = await query('SELECT id FROM payment_debt_payments WHERE debt_id = ?', [id]);
    for (const payment of paymentRows) {
      await query('DELETE FROM payment_debt_payments WHERE id = ? AND debt_id = ?', [payment.id, id]);
    }
    
    // Delete main debt
    await query('DELETE FROM payment_debts WHERE id = ?', [id]);

    await insertAuditLogSafe({
      action: 'DELETE',
      module: 'PAYMENT_DEBT',
      entityType: 'PAYMENT_DEBT',
      entityId: id,
      createdBy: adminUser.displayName || adminUser.username,
      detail: {
        targetLabel: debt.customer_name || id,
        beforeData: debt,
      },
    });

    return json({ success: true, deleted_id: id });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[payment-debts/delete] DELETE failed', error);
    return json({ error: 'Unable to delete payment debt' }, { status: 503 });
  }
}
