import {
  cleanString,
  ensureStockMovementsTable,
  isAuthorizedStockRequest,
  normalizeStockMovementInput,
  normalizeStockMovementRow,
  query,
} from '../../../../lib/stockStorage';
import { getAuthorizedAdminFromRequest } from '../../../../lib/adminAuth';
import { insertAuditLogSafe } from '../../../../lib/auditLog';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request) {
  try {
    if (!(await isAuthorizedStockRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureStockMovementsTable();
    const productId = cleanString(new URL(request.url).searchParams.get('productId'), 64);
    const rows = await query(
      `SELECT *
       FROM stock_movements
       ${productId ? 'WHERE product_id = ?' : ''}
       ORDER BY created_at DESC LIMIT 5000`,
      productId ? [productId] : []
    );
    return json({ success: true, movements: rows.map(normalizeStockMovementRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[stock/movements] GET failed', error);
    return json({ error: 'Stock movements unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const movement = normalizeStockMovementInput(body);
    if (!movement.productId) return json({ error: 'productId is required' }, { status: 400 });
    await ensureStockMovementsTable();
    await query(
      `INSERT INTO stock_movements (
        id, product_id, product_code, product_name, movement_type, quantity, quantity_before, quantity_after, note, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movement.id,
        movement.productId,
        movement.productCode,
        movement.productName,
        movement.movementType,
        movement.quantity,
        movement.quantityBefore,
        movement.quantityAfter,
        movement.note,
        movement.createdBy,
      ]
    );
    const rows = await query(
      `SELECT *
       FROM stock_movements
       WHERE id = ?
       LIMIT 1`,
      [movement.id]
    );
    const savedMovement = normalizeStockMovementRow(rows[0] || movement);
    await insertAuditLogSafe({
      action: 'CREATE',
      module: 'STOCK',
      entityType: 'STOCK_MOVEMENT',
      entityId: savedMovement.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: savedMovement.productName || savedMovement.productCode || savedMovement.productId,
        beforeData: null,
        afterData: savedMovement,
      },
    });
    return json({ success: true, movement: savedMovement }, { status: 200 });
  } catch (error) {
    console.error('[stock/movements] POST failed', error);
    return json({ error: 'Unable to save stock movement' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    await ensureStockMovementsTable();
    const rows = await query(
      `SELECT *
       FROM stock_movements
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    const previousMovement = Array.isArray(rows) && rows.length ? normalizeStockMovementRow(rows[0]) : null;
    await query('DELETE FROM stock_movements WHERE id = ?', [id]);
    if (previousMovement) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'STOCK',
        entityType: 'STOCK_MOVEMENT',
        entityId: previousMovement.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: previousMovement.productName || previousMovement.productCode || previousMovement.productId,
          beforeData: previousMovement,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[stock/movements] DELETE failed', error);
    return json({ error: 'Unable to delete stock movement' }, { status: 503 });
  }
}
