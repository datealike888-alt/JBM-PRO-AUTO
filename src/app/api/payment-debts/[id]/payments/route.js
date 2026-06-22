import { getAuthorizedAdminFromRequest, isAuthorizedAdminRequest } from '../../../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../../../lib/auditLog';
import { addDebtPayment, cleanString, getPaymentDebtById } from '../../../../../lib/paymentDebtStorage';

function json(data, init = {}) {
  return Response.json(data, init);
}

async function getRouteId(context) {
  const params = await context?.params;
  return cleanString(params?.id, 64);
}

export async function GET(request, context) {
  try {
    if (!(await isAuthorizedAdminRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = await getRouteId(context);
    if (!id) return json({ error: 'Missing id' }, { status: 400 });
    const debt = await getPaymentDebtById(id);
    if (!debt) return json({ error: 'Payment debt not found' }, { status: 404 });
    return json({ success: true, payments: debt.payments || [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[payment-debts/[id]/payments] GET failed', error);
    return json({ error: 'Debt payments unavailable' }, { status: 503 });
  }
}

export async function POST(request, context) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    const id = await getRouteId(context);
    if (!id) return json({ error: 'Missing id' }, { status: 400 });
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const debt = await addDebtPayment(id, body);
    if (debt.error) return json({ error: debt.error }, { status: 400 });
    await insertAuditLogSafe({
      action: 'CREATE',
      module: 'FINANCIAL',
      entityType: 'PAYMENT_DEBT_PAYMENT',
      entityId: id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: debt.customer_name || debt.id,
        afterData: debt,
      },
    });
    return json({ success: true, debt }, { status: 200 });
  } catch (error) {
    console.error('[payment-debts/[id]/payments] POST failed', error);
    return json({ error: 'Unable to save debt payment' }, { status: 503 });
  }
}
