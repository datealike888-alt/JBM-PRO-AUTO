import { isAuthorizedAdminRequest } from './adminAuth';
import { query } from './db';

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function cleanNullable(value, maxLength = 255) {
  const text = cleanString(value, maxLength);
  return text || null;
}

function cleanImageUrl(value) {
  const text = cleanString(value, 500);
  if (!text) return null;
  if (text.startsWith('data:')) return { error: 'Product image must be uploaded before saving' };
  if (/^\/uploads\/stock\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? text : { error: 'Invalid product image URL' };
  } catch {
    return { error: 'Invalid product image URL' };
  }
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  const text = cleanString(value, 16).toLowerCase();
  if (!text) return fallback;
  if (['0', 'false', 'no', 'inactive', 'disabled', 'ปิด', 'ปิดใช้งาน'].includes(text)) return false;
  if (['1', 'true', 'yes', 'active', 'enabled', 'ใช้งาน', 'เปิด', 'เปิดใช้งาน'].includes(text)) return true;
  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : fallback;
}

function fallbackStockMovementType(quantityChange, body = {}) {
  const deleteHint = cleanString(body.action || body.intent || body.note, 100).toLowerCase();
  if (deleteHint.includes('delete') || deleteHint.includes('remove') || deleteHint.includes('ลบสินค้า')) return 'ลบสินค้า';
  if (quantityChange > 0) return 'รับเข้า';
  if (quantityChange < 0) return 'เบิกออก';
  return 'ปรับปรุง';
}

function schemaError(message) {
  const error = new Error(message);
  error.code = 'STOCK_SCHEMA_NOT_READY';
  return error;
}

async function assertTableColumns(tableName, requiredColumns) {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  const columnNames = new Set(rows.map((row) => row.COLUMN_NAME));
  if (columnNames.size === 0) {
    throw schemaError(`Missing stock table: ${tableName}. Run db/migration-20260711-stock-canonical-schema.sql before using stock APIs.`);
  }
  const missingColumns = requiredColumns.filter((column) => !columnNames.has(column));
  if (missingColumns.length > 0) {
    throw schemaError(`Stock table ${tableName} is missing columns: ${missingColumns.join(', ')}. Run db/migration-20260711-stock-canonical-schema.sql.`);
  }
}

export async function ensureStockCategoriesTable() {
  await assertTableColumns('stock_categories', [
    'id',
    'name',
    'description',
    'is_active',
    'created_at',
    'updated_at',
  ]);
}

export async function ensureStockProductsTable() {
  await ensureStockCategoriesTable();
  await assertTableColumns('stock_products', [
    'id',
    'code',
    'name',
    'product_code',
    'product_name',
    'part_no',
    'category_id',
    'category',
    'brand',
    'car_models',
    'compatible_models',
    'engine_number',
    'engine_code',
    'price',
    'sale_price',
    'cost_price',
    'location',
    'quantity',
    'reorder_point',
    'min_stock',
    'supplier',
    'status',
    'image_url',
    'unit',
    'note',
    'created_at',
    'updated_at',
  ]);
}

export async function ensureStockMovementsTable() {
  await ensureStockProductsTable();
  await assertTableColumns('stock_movements', [
    'id',
    'product_id',
    'code',
    'name',
    'type',
    'product_code',
    'product_name',
    'movement_type',
    'quantity_change',
    'quantity_before',
    'quantity_after',
    'note',
    'created_by',
    'created_at',
  ]);
}

export async function ensureStockTables() {
  await ensureStockCategoriesTable();
  await ensureStockProductsTable();
  await ensureStockMovementsTable();
}

export async function isAuthorizedStockRequest(request) {
  return isAuthorizedAdminRequest(request);
}

export function normalizeStockCategoryInput(body = {}) {
  return {
    id: cleanString(body.id, 64) || `stock-cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanString(body.name || body.category_name || body.categoryName, 255),
    description: cleanNullable(body.description, 5000),
    isActive: normalizeBoolean(body.is_active ?? body.isActive ?? body.active ?? body.status, true),
  };
}

export function normalizeStockCategoryRow(row) {
  return {
    id: row.id || row.category_id || row.categoryId,
    name: row.name || row.category_name || row.categoryName || '',
    description: row.description || '',
    is_active: normalizeBoolean(row.is_active ?? row.isActive ?? row.active ?? row.status, true),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export function normalizeStockProductInput(body = {}) {
  const imageUrl = cleanImageUrl(body.image_url);
  const productCode = cleanNullable(body.code ?? body.product_code, 100);
  const productName = cleanString(body.name ?? body.product_name, 255);
  const partNo = cleanNullable(body.part_no ?? body.partNo ?? body.product_number, 100);
  const brand = cleanNullable(body.brand ?? body.product_brand, 100);
  const carModels = cleanNullable(body.car_models ?? body.carModels ?? body.car_model, 255);
  const location = cleanNullable(body.location ?? body.storage_location, 255);
  return {
    id: cleanString(body.id, 64) || `stk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productCode,
    productName,
    productNumber: partNo,
    categoryId: cleanNullable(body.category_id, 64),
    categoryName: cleanString(body.category || body.category_name, 255),
    productBrand: brand,
    carBrand: cleanNullable(body.car_brand, 100),
    carModel: carModels,
    engineNumber: cleanNullable(body.engine_number, 100),
    price: Math.max(0, normalizeNumber(body.price, 0)),
    storageLocation: location,
    quantity: Math.max(0, Math.trunc(normalizeNumber(body.quantity, 0))),
    reorderPoint: Math.max(0, Math.trunc(normalizeNumber(body.reorder_point, 0))),
    supplier: cleanNullable(body.supplier, 255),
    status: cleanNullable(body.status, 50),
    imageUrl,
    note: cleanNullable(body.note, 5000),
  };
}

export function normalizeStockProductRow(row) {
  const productCode = row.code || row.product_code || '';
  const productName = row.name || row.product_name || '';
  const partNo = row.part_no || row.product_number || '';
  const categoryName = row.category || row.category_name || '';
  const brand = row.brand || row.product_brand || '';
  const carModels = row.car_models || row.compatible_models || row.car_model || '';
  const location = row.location || row.storage_location || '';
  return {
    id: row.id,
    code: productCode,
    name: productName,
    part_no: partNo,
    category: categoryName,
    brand,
    car_models: carModels,
    carModels,
    location,
    product_code: productCode,
    product_name: productName,
    product_number: partNo,
    category_id: row.category_id || '',
    category_name: categoryName,
    product_brand: brand,
    car_brand: row.car_brand || '',
    car_model: carModels,
    engine_number: row.engine_number || '',
    price: Number(row.price || 0),
    storage_location: location,
    quantity: Number(row.quantity || 0),
    reorder_point: Number(row.reorder_point || 0),
    supplier: row.supplier || '',
    status: row.status || '',
    image_url: row.image_url || '',
    note: row.note || '',
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export function normalizeStockMovementInput(body = {}) {
  const quantityChange = Math.trunc(normalizeNumber(body.quantity_change ?? body.quantity ?? body.quantityChange, 0));
  const fallbackType = fallbackStockMovementType(quantityChange, body);
  const movementType = cleanString(
    body.type || body.movement_type || body.movementType || fallbackType,
    50
  ) || fallbackType;
  const code = cleanNullable(body.code || body.product_code || body.productCode, 100);
  const name = cleanNullable(body.name || body.product_name || body.productName, 255);
  const productCode = cleanNullable(body.code || body.product_code || body.productCode, 100);
  const productName = cleanNullable(body.name || body.product_name || body.productName, 255);
  return {
    id: cleanString(body.id, 64) || `stock-move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: cleanString(body.product_id || body.productId, 64),
    code,
    name,
    type: movementType,
    productCode,
    productName,
    movementType,
    quantityChange,
    quantityBefore: Math.trunc(normalizeNumber(body.quantity_before || body.quantityBefore, 0)),
    quantityAfter: Math.trunc(normalizeNumber(body.quantity_after || body.quantityAfter, 0)),
    note: cleanNullable(body.note, 5000),
    createdBy: cleanNullable(body.created_by || body.createdBy, 100),
  };
}

export function normalizeStockMovementRow(row) {
  const movementType = row.type || row.movement_type || '';
  const quantityChange = Number(row.quantity_change ?? 0);
  return {
    id: row.id,
    type: movementType,
    quantity_change: quantityChange,
    product_id: row.product_id,
    movement_type: movementType,
    quantity: quantityChange,
    quantity_before: Number(row.quantity_before || 0),
    quantity_after: Number(row.quantity_after || 0),
    code: row.code || row.product_code || '',
    name: row.name || row.product_name || '',
    product_code: row.product_code || row.code || '',
    product_name: row.product_name || row.name || '',
    note: row.note || '',
    created_by: row.created_by || '',
    created_at: row.created_at || null,
  };
}

export { cleanString, query };
