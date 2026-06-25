import { getAuthorizedAdminFromRequest, isAuthorizedAdminRequest } from '../../../lib/adminAuth';
import { requirePermission } from '../../../lib/adminPermissions';
import { insertAuditLogSafe } from '../../../lib/auditLog';
import {
  cleanString,
  ensurePaymentDebtTables,
  getPaymentDebts,
  savePaymentDebt,
} from '../../../lib/paymentDebtStorage';

function json(data, init = {}) {
  return Response.json(data, init);
}

export async function GET(request) {
  try {
    const authResult = await requirePermission(request, 'paymentDebts.view');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    await ensurePaymentDebtTables();
    const url = new URL(request.url);
    const debts = await getPaymentDebts({
      search: cleanString(url.searchParams.get('search'), 100),
      status: cleanString(url.searchParams.get('status'), 64),
    });
    const openDebts = debts.filter((debt) => Number(debt.balance_amount || 0) > 0);
    const today = new Date().toISOString().slice(0, 10);
    const summary = {
      count: debts.length,
      open_count: openDebts.length,
      customer_count: new Set(openDebts.map((debt) => debt.customer_name).filter(Boolean)).size,
      total_balance: openDebts.reduce((sum, debt) => sum + Number(debt.balance_amount || 0), 0),
      due_today_count: openDebts.filter((debt) => debt.due_date === today).length,
      overdue_count: openDebts.filter((debt) => debt.due_date && debt.due_date < today).length,
    };
    return json({ success: true, debts, summary }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[payment-debts] GET failed', error);
    return json({ error: 'Payment debts unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requirePermission(request, 'paymentDebts.update'); // Using update as it covers both create and update for debts
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!cleanString(body.customer_name || body.customerName, 255)) return json({ error: 'customer_name is required' }, { status: 400 });
    const debt = await savePaymentDebt(body);
    if (debt.error) return json({ error: debt.error }, { status: 400 });
    await insertAuditLogSafe({
      action: body.id ? 'UPDATE' : 'CREATE',
      module: 'FINANCIAL',
      entityType: 'PAYMENT_DEBT',
      entityId: debt.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: debt.customer_name || debt.id,
        afterData: debt,
      },
    });
    return json({ success: true, debt }, { status: 200 });
  } catch (error) {
    console.error('[payment-debts] POST failed', error);
    return json({ error: 'Unable to save payment debt' }, { status: 503 });
  }
}
