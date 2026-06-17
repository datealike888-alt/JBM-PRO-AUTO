import {
  cleanString,
  ensureStockCategoriesTable,
  isAuthorizedStockRequest,
  normalizeStockCategoryInput,
  normalizeStockCategoryRow,
  query,
} from '../../../../lib/stockStorage';

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
    if (!(await isAuthorizedStockRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const category = normalizeStockCategoryInput(body);
    if (!category.name) return json({ error: 'Category name is required' }, { status: 400 });
    await ensureStockCategoriesTable();
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
    return json({ error: 'Unable to save stock category' }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthorizedStockRequest(request))) return json({ error: 'Forbidden' }, { status: 403 });
    const id = cleanString(new URL(request.url).searchParams.get('id'), 64);
    if (!id) return json({ error: 'Missing id parameter' }, { status: 400 });
    await ensureStockCategoriesTable();
    await query('DELETE FROM stock_categories WHERE id = ?', [id]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[stock/categories] DELETE failed', error);
    return json({ error: 'Unable to delete stock category' }, { status: 503 });
  }
}

