import { getAuthorizedAdminFromRequest } from '../../../../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../../../../lib/auditLog';
import { cleanString, deleteDebtPaymentById } from '../../../../../../lib/paymentDebtStorage';

function json(data, init = {}) {
  return Response.json(data, init);
}

export async function DELETE(request, { params }) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });

    const resolvedParams = await params;
    const id = cleanString(resolvedParams?.id, 64);
    const paymentId = cleanString(resolvedParams?.paymentId, 64);
    if (!id || !paymentId) return json({ error: 'Missing id' }, { status: 400 });

    const result = await deleteDebtPaymentById(id, paymentId);
    if (result.error) return json({ error: result.error }, { status: 404 });

    await insertAuditLogSafe({
      action: 'DELETE',
      module: 'FINANCIAL',
      entityType: 'PAYMENT_DEBT_PAYMENT',
      entityId: paymentId,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: result.debt?.customer_name || id,
        beforeData: result.payment,
        afterData: result.debt,
      },
    });

    return json({ success: true, deleted_id: paymentId, debt: result.debt }, { status: 200 });
  } catch (error) {
    console.error('[payment-debts/[id]/payments/[paymentId]] DELETE failed', error);
    return json({ error: 'Unable to delete debt payment' }, { status: 503 });
  }
}
