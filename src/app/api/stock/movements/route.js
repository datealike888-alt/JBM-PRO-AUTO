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
import { requirePermission } from '../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function GET(request) {
  try {
    const authResult = await requirePermission(request, 'stock.view');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
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
    const authResult = await requirePermission(request, 'stock.movement');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const movement = normalizeStockMovementInput(body);
    if (!movement.productId) return json({ error: 'productId is required' }, { status: 400 });
    await ensureStockMovementsTable();

    const productRows = await query(
      `SELECT id, code, name, product_code, product_name
       FROM stock_products
       WHERE id = ?
       LIMIT 1`,
      [movement.productId]
    );
    const product = Array.isArray(productRows) && productRows.length ? productRows[0] : {};
    if (!product.id) return json({ error: 'productId not found' }, { status: 400 });
    const code = movement.code || product.code || product.product_code || '';
    const name = movement.name || product.name || product.product_name || '';
    const productCode = movement.productCode || code;
    const productName = movement.productName || name;

    await query(
      `INSERT INTO stock_movements (
        id, product_id, code, name, type, product_code, product_name, movement_type,
        quantity_change, quantity_before, quantity_after, note, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movement.id,
        movement.productId,
        code,
        name,
        movement.type,
        productCode,
        productName,
        movement.movementType,
        movement.quantityChange,
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
    const authResult = await requirePermission(request, 'stock.delete');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
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
