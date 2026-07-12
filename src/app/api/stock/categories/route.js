import {
  cleanString,
  ensureStockCategoriesTable,
  ensureStockProductsTable,
  normalizeStockCategoryInput,
  normalizeStockCategoryRow,
  query,
} from '../../../../lib/stockStorage';
import { withTransaction } from '../../../../lib/db';
import { requirePermission, requireAnyPermission, hasPermission } from '../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function productCountValue(rows) {
  return Number(rows?.[0]?.product_count ?? rows?.[0]?.total ?? 0);
}

async function loadCategoryProducts(categoryId, conn = null) {
  const executor = conn || { query };
  const countRows = await executor.query(
    'SELECT COUNT(*) AS product_count FROM stock_products WHERE category_id = ?',
    [categoryId]
  );
  const products = await executor.query(
    `SELECT id, COALESCE(product_code, code, '') AS code, COALESCE(product_name, name, '') AS product_name
     FROM stock_products
     WHERE category_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [categoryId]
  );
  return {
    productCount: productCountValue(countRows),
    products: Array.isArray(products) ? products.map((product) => ({
      id: product.id,
      code: product.code || '',
      product_name: product.product_name || '',
    })) : [],
  };
}

async function insertStockCategoryAudit(conn, { action, entityId, createdBy, detail }) {
  await conn.query(
    `INSERT INTO audit_logs (id, action, module, entity_type, entity_id, detail, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('audit'),
      action,
      'STOCK',
      'STOCK_CATEGORY',
      entityId,
      JSON.stringify(detail || {}),
      createdBy || null,
    ]
  );
}

export async function GET(request) {
  try {
    const authResult = await requirePermission(request, 'stock.view');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    await ensureStockCategoriesTable();
    const rows = await query('SELECT * FROM stock_categories ORDER BY created_at DESC');
    return json({ success: true, categories: rows.map(normalizeStockCategoryRow) }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[stock/categories] GET failed', error);
    return json({ error: 'Stock categories unavailable' }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requireAnyPermission(request, ['stock.create', 'stock.update']);
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const body = await request.json();
    const category = normalizeStockCategoryInput(body);
    if (!category.name) return json({ error: 'Category name is required' }, { status: 400 });
    await ensureStockCategoriesTable();
    const duplicateRows = await query('SELECT id FROM stock_categories WHERE name = ? AND id <> ? LIMIT 1', [category.name, category.id]);
    if (duplicateRows.length > 0) return json({ error: 'มีหมวดหมู่นี้อยู่แล้ว กรุณาใช้ชื่ออื่น' }, { status: 409 });
    await query(
      `INSERT INTO stock_categories (id, name, description, is_active)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         is_active = VALUES(is_active)`,
      [category.id, category.name, category.description, category.isActive ? 1 : 0]
    );
    const rows = await query('SELECT * FROM stock_categories WHERE id = ? LIMIT 1', [category.id]);
    return json({ success: true, category: normalizeStockCategoryRow(rows[0] || category) }, { status: 200 });
  } catch (error) {
    console.error('[stock/categories] POST failed', error);
    if (Number(error?.errno || 0) === 1062) {
      return json({ error: 'มีหมวดหมู่นี้อยู่แล้ว กรุณาใช้ชื่ออื่น' }, { status: 409 });
    }
    return json({ error: 'Unable to save stock category' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'stock.delete');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });
    const admin = authResult.admin;
    const url = new URL(request.url);
    const id = cleanString(url.searchParams.get('id'), 64);
    const reassignTo = cleanString(url.searchParams.get('reassignTo'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    if (reassignTo && !hasPermission(authResult.permissions, 'stock.update')) {
      return json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }
    if (reassignTo && reassignTo === id) {
      return json({ error: 'SOURCE_TARGET_SAME', message: 'หมวดหมู่ต้นทางและปลายทางต้องไม่ใช่รายการเดียวกัน' }, { status: 400 });
    }

    await ensureStockCategoriesTable();
    await ensureStockProductsTable();

    if (!reassignTo) {
      const categoryRows = await query('SELECT * FROM stock_categories WHERE id = ? LIMIT 1', [id]);
      if (!Array.isArray(categoryRows) || categoryRows.length === 0) {
        return json({ error: 'CATEGORY_NOT_FOUND', message: 'ไม่พบหมวดหมู่ที่ต้องการลบ' }, { status: 404 });
      }
      const { productCount, products } = await loadCategoryProducts(id);
      if (productCount > 0) {
        return json({
          error: 'CATEGORY_IN_USE',
          message: 'ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากยังมีสินค้าใช้งานอยู่',
          category_id: id,
          product_count: productCount,
          products,
        }, { status: 409 });
      }

      await withTransaction(async (conn) => {
        const lockedRows = await conn.query('SELECT * FROM stock_categories WHERE id = ? FOR UPDATE', [id]);
        if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
          const error = new Error('ไม่พบหมวดหมู่ที่ต้องการลบ');
          error.status = 404;
          error.code = 'CATEGORY_NOT_FOUND';
          throw error;
        }
        const productRows = await conn.query('SELECT COUNT(*) AS product_count FROM stock_products WHERE category_id = ?', [id]);
        const productCount = productCountValue(productRows);
        if (productCount > 0) {
          const error = new Error('ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากยังมีสินค้าใช้งานอยู่');
          error.status = 409;
          error.code = 'CATEGORY_IN_USE';
          error.categoryId = id;
          error.productCount = productCount;
          throw error;
        }
        await conn.query('DELETE FROM stock_categories WHERE id = ?', [id]);
        await insertStockCategoryAudit(conn, {
          action: 'DELETE',
          entityId: id,
          createdBy: admin.displayName || admin.username,
          detail: {
            targetLabel: lockedRows[0].name || id,
            beforeData: normalizeStockCategoryRow(lockedRows[0]),
            afterData: null,
          },
        });
      });
      return json({ success: true }, { status: 200 });
    }

    const result = await withTransaction(async (conn) => {
      const sourceRows = await conn.query('SELECT * FROM stock_categories WHERE id = ? FOR UPDATE', [id]);
      if (!Array.isArray(sourceRows) || sourceRows.length === 0) {
        const error = new Error('ไม่พบหมวดหมู่ต้นทาง');
        error.status = 404;
        error.code = 'CATEGORY_NOT_FOUND';
        throw error;
      }

      const targetRows = await conn.query('SELECT * FROM stock_categories WHERE id = ? FOR UPDATE', [reassignTo]);
      if (!Array.isArray(targetRows) || targetRows.length === 0) {
        const error = new Error('ไม่พบหมวดหมู่ปลายทาง');
        error.status = 404;
        error.code = 'TARGET_CATEGORY_NOT_FOUND';
        throw error;
      }
      if (Number(targetRows[0].is_active) === 0) {
        const error = new Error('หมวดหมู่ปลายทางปิดใช้งานอยู่');
        error.status = 400;
        error.code = 'TARGET_CATEGORY_INACTIVE';
        throw error;
      }

      const productRows = await conn.query('SELECT COUNT(*) AS product_count FROM stock_products WHERE category_id = ?', [id]);
      const productCount = productCountValue(productRows);

      await conn.query(
        'UPDATE stock_products SET category_id = ? WHERE category_id = ?',
        [reassignTo, id]
      );
      await conn.query('DELETE FROM stock_categories WHERE id = ?', [id]);
      await insertStockCategoryAudit(conn, {
        action: 'DELETE',
        entityId: id,
        createdBy: admin.displayName || admin.username,
        detail: {
          targetLabel: sourceRows[0].name || id,
          sourceCategory: normalizeStockCategoryRow(sourceRows[0]),
          targetCategory: normalizeStockCategoryRow(targetRows[0]),
          movedProductCount: productCount,
          reassignTo,
        },
      });

      return {
        movedProductCount: productCount,
        sourceCategory: normalizeStockCategoryRow(sourceRows[0]),
        targetCategory: normalizeStockCategoryRow(targetRows[0]),
      };
    });

    return json({
      success: true,
      message: 'ย้ายสินค้าและลบหมวดหมู่เรียบร้อยแล้ว',
      moved_product_count: result.movedProductCount,
      source_category_id: id,
      target_category_id: reassignTo,
    }, { status: 200 });
  } catch (error) {
    if (error?.code === 'CATEGORY_IN_USE') {
      const { products } = await loadCategoryProducts(error.categoryId || cleanString(new URL(request.url).searchParams.get('id'), 64)).catch(() => ({ products: [] }));
      return json({
        error: 'CATEGORY_IN_USE',
        message: error.message || 'ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากยังมีสินค้าใช้งานอยู่',
        category_id: error.categoryId,
        product_count: Number(error.productCount || 0),
        products,
      }, { status: 409 });
    }
    if (error?.status) {
      return json({ error: error.code || 'STOCK_CATEGORY_ERROR', message: error.message || 'ดำเนินการไม่สำเร็จ' }, { status: error.status });
    }
    console.error('[stock/categories] DELETE failed', error);
    return json({ error: 'Unable to delete stock category' }, { status: 503 });
  }
}
