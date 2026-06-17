import {
  cleanString,
  ensureStockProductsTable,
  isAuthorizedStockRequest,
  normalizeStockProductInput,
  normalizeStockProductRow,
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

function buildWhere(url) {
  const where = [];
  const params = [];
  const search = cleanString(url.searchParams.get('search'), 100).toLowerCase();
  if (search) {
    const like = `%${search}%`;
    where.push(`(
      LOWER(COALESCE(product_code, '')) LIKE ?
      OR LOWER(COALESCE(product_name, '')) LIKE ?
      OR LOWER(COALESCE(product_number, '')) LIKE ?
      OR LOWER(COALESCE(product_brand, '')) LIKE ?
      OR LOWER(COALESCE(car_model, '')) LIKE ?
      OR LOWER(COALESCE(engine_number, '')) LIKE ?
      OR LOWER(COALESCE(supplier, '')) LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like);
  }
  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function GET(request) {
  try {
    if (!(await isAuthorizedStockRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    await ensureStockProductsTable();
    const where = buildWhere(new URL(request.url));
    const rows = await query(
      `SELECT sp.*, sc.name AS category_name
       FROM stock_products sp
       LEFT JOIN stock_categories sc ON sc.id = sp.category_id
       ${where.clause}
       ORDER BY sp.created_at DESC`,
      where.params
    );
    return json({ success: true, products: rows.map(normalizeStockProductRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[stock/products] GET failed', error);
    return json({ error: 'Stock products unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const product = normalizeStockProductInput(body);
    if (!product.productName) return json({ error: 'Product name is required' }, { status: 400 });

    let categoryId = product.categoryId;
    if (!categoryId && product.categoryName) {
      const categoryRows = await query('SELECT id FROM stock_categories WHERE name = ? LIMIT 1', [product.categoryName]);
      categoryId = categoryRows[0]?.id || null;
    }

    await ensureStockProductsTable();
    const beforeRows = await query(
      `SELECT sp.*, sc.name AS category_name
       FROM stock_products sp
       LEFT JOIN stock_categories sc ON sc.id = sp.category_id
       WHERE sp.id = ?
       LIMIT 1`,
      [product.id]
    );
    const previousProduct = Array.isArray(beforeRows) && beforeRows.length ? normalizeStockProductRow(beforeRows[0]) : null;
    await query(
      `INSERT INTO stock_products (
        id, product_code, product_name, product_number, category_id, product_brand, car_brand, car_model,
        engine_number, price, storage_location, quantity, reorder_point, supplier, status, image_url, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        product_code = VALUES(product_code),
        product_name = VALUES(product_name),
        product_number = VALUES(product_number),
        category_id = VALUES(category_id),
        product_brand = VALUES(product_brand),
        car_brand = VALUES(car_brand),
        car_model = VALUES(car_model),
        engine_number = VALUES(engine_number),
        price = VALUES(price),
        storage_location = VALUES(storage_location),
        quantity = VALUES(quantity),
        reorder_point = VALUES(reorder_point),
        supplier = VALUES(supplier),
        status = VALUES(status),
        image_url = VALUES(image_url),
        note = VALUES(note)`,
      [
        product.id,
        product.productCode,
        product.productName,
        product.productNumber,
        categoryId,
        product.productBrand,
        product.carBrand,
        product.carModel,
        product.engineNumber,
        product.price,
        product.storageLocation,
        product.quantity,
        product.reorderPoint,
        product.supplier,
        product.status,
        product.imageUrl,
        product.note,
      ]
    );
    const rows = await query(
      `SELECT sp.*, sc.name AS category_name
       FROM stock_products sp
       LEFT JOIN stock_categories sc ON sc.id = sp.category_id
       WHERE sp.id = ?
       LIMIT 1`,
      [product.id]
    );
    const savedProduct = normalizeStockProductRow(rows[0] || product);
    await insertAuditLogSafe({
      action: previousProduct ? 'UPDATE' : 'CREATE',
      module: 'STOCK',
      entityType: 'STOCK_PRODUCT',
      entityId: savedProduct.id,
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: savedProduct.productName || savedProduct.productCode || savedProduct.id,
        beforeData: previousProduct,
        afterData: savedProduct,
      },
    });
    return json({ success: true, product: savedProduct }, { status: 200 });
  } catch (error) {
    console.error('[stock/products] POST failed', error);
    return json({ error: 'Unable to save stock product' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAuthorizedAdminFromRequest(request);
    if (!admin) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    await ensureStockProductsTable();
    const rows = await query(
      `SELECT sp.*, sc.name AS category_name
       FROM stock_products sp
       LEFT JOIN stock_categories sc ON sc.id = sp.category_id
       WHERE sp.id = ?
       LIMIT 1`,
      [id]
    );
    const previousProduct = Array.isArray(rows) && rows.length ? normalizeStockProductRow(rows[0]) : null;
    await query('DELETE FROM stock_products WHERE id = ?', [id]);
    if (previousProduct) {
      await insertAuditLogSafe({
        action: 'DELETE',
        module: 'STOCK',
        entityType: 'STOCK_PRODUCT',
        entityId: previousProduct.id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: previousProduct.productName || previousProduct.productCode || previousProduct.id,
          beforeData: previousProduct,
          afterData: null,
        },
      });
    }
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[stock/products] DELETE failed', error);
    return json({ error: 'Unable to delete stock product' }, { status: 503 });
  }
}
