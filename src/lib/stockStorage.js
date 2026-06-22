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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function fallbackStockMovementType(quantityChange, body = {}) {
  const deleteHint = cleanString(body.action || body.intent || body.note, 100).toLowerCase();
  if (deleteHint.includes('delete') || deleteHint.includes('remove') || deleteHint.includes('ลบสินค้า')) return 'ลบสินค้า';
  if (quantityChange > 0) return 'รับเข้า';
  if (quantityChange < 0) return 'เบิกออก';
  return 'ปรับปรุง';
}

async function ensureIndex(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (![1061, 1062].includes(Number(error?.errno || 0))) throw error;
  }
}

async function ensureColumn(sql) {
  try {
    await query(sql);
  } catch (error) {
    if ([1205, 1213].includes(Number(error?.errno || 0))) {
      await wait(150);
      try {
        await query(sql);
        return;
      } catch (retryError) {
        if (![1005, 1060, 1061, 1062, 1091, 1205, 1213, 1215, 1826].includes(Number(retryError?.errno || 0))) throw retryError;
        return;
      }
    }
    if (![1005, 1060, 1061, 1062, 1091, 1215, 1826].includes(Number(error?.errno || 0))) throw error;
  }
}

async function ensureStockMovementQuantityChangeColumn() {
  const columns = await query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
  `);
  const columnNames = new Set(columns.map((column) => column.COLUMN_NAME));
  const hasQuantity = columnNames.has('quantity');
  const hasQuantityChange = columnNames.has('quantity_change');

  if (hasQuantity && !hasQuantityChange) {
    try {
      await query('ALTER TABLE stock_movements CHANGE COLUMN quantity quantity_change INT NOT NULL');
    } catch (error) {
      if (!['ER_BAD_FIELD_ERROR', 'ER_DUP_FIELDNAME'].includes(error?.code)) {
        throw error;
      }
      console.warn('[stockStorage] Rename quantity to quantity_change skipped because schema is already migrated', error.message);
    }
    return;
  }

  if (!hasQuantity && !hasQuantityChange) {
    await ensureColumn('ALTER TABLE stock_movements ADD COLUMN quantity_change INT NOT NULL DEFAULT 0');
  }
}

export async function ensureStockCategoriesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS stock_categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_stock_categories_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE stock_categories ADD COLUMN description TEXT NULL');
  await ensureColumn('ALTER TABLE stock_categories ADD COLUMN is_active TINYINT(1) DEFAULT 1');
  await ensureColumn('ALTER TABLE stock_categories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('ALTER TABLE stock_categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await ensureIndex('ALTER TABLE stock_categories ADD UNIQUE KEY idx_stock_categories_name (name)');
}

export async function ensureStockProductsTable() {
  await ensureStockCategoriesTable();
  await query(`
    CREATE TABLE IF NOT EXISTS stock_products (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(100) NULL,
      name VARCHAR(255) NULL,
      product_code VARCHAR(100) NULL,
      product_name VARCHAR(255) NULL,
      part_no VARCHAR(100) NULL,
      category_id VARCHAR(64) NULL,
      category VARCHAR(255) NULL,
      brand VARCHAR(100) NULL,
      car_models VARCHAR(255) NULL,
      compatible_models VARCHAR(255) NULL,
      engine_number VARCHAR(100) NULL,
      engine_code VARCHAR(100) NULL,
      price DECIMAL(12,2) DEFAULT 0,
      sale_price DECIMAL(12,2) DEFAULT 0,
      cost_price DECIMAL(12,2) DEFAULT 0,
      location VARCHAR(255) NULL,
      quantity INT DEFAULT 0,
      reorder_point INT DEFAULT 0,
      min_stock INT DEFAULT 0,
      supplier VARCHAR(255) NULL,
      status VARCHAR(50) NULL,
      image_url TEXT NULL,
      unit VARCHAR(50) NULL,
      note TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_stock_products_code (product_code),
      INDEX idx_stock_products_name (product_name),
      INDEX idx_stock_products_category_id (category_id),
      CONSTRAINT fk_stock_products_category_id
        FOREIGN KEY (category_id) REFERENCES stock_categories(id)
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE stock_products ADD COLUMN code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN product_code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN product_name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN part_no VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN category_id VARCHAR(64) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN category VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN brand VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN car_models VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN compatible_models VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN engine_number VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN engine_code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN price DECIMAL(12,2) DEFAULT 0');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN sale_price DECIMAL(12,2) DEFAULT 0');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN cost_price DECIMAL(12,2) DEFAULT 0');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN location VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN quantity INT DEFAULT 0');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN reorder_point INT DEFAULT 0');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN min_stock INT DEFAULT 0');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN supplier VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN status VARCHAR(50) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN image_url TEXT NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN unit VARCHAR(50) NULL');
  await ensureColumn('ALTER TABLE stock_products ADD COLUMN note TEXT NULL');
}

export async function ensureStockMovementsTable() {
  await ensureStockProductsTable();
  await query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64) NULL,
      code VARCHAR(100) NULL,
      name VARCHAR(255) NULL,
      type VARCHAR(50) NOT NULL,
      product_code VARCHAR(100) NULL,
      product_name VARCHAR(255) NULL,
      movement_type VARCHAR(50) NOT NULL,
      quantity_change INT NOT NULL,
      quantity_before INT DEFAULT 0,
      quantity_after INT DEFAULT 0,
      note TEXT NULL,
      created_by VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_movements_product_id (product_id),
      INDEX idx_stock_movements_created_at (created_at),
      CONSTRAINT fk_stock_movements_product_id
        FOREIGN KEY (product_id) REFERENCES stock_products(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN type VARCHAR(50) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN product_code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN product_name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN movement_type VARCHAR(50) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN created_by VARCHAR(100) NULL');
  await ensureStockMovementQuantityChangeColumn();
  try {
    await query(`
      UPDATE stock_movements sm
      LEFT JOIN stock_products sp ON sp.id = sm.product_id
      SET
        sm.code = COALESCE(NULLIF(sm.code, ''), NULLIF(sm.product_code, ''), sp.code, sp.product_code),
        sm.name = COALESCE(NULLIF(sm.name, ''), NULLIF(sm.product_name, ''), sp.name, sp.product_name),
        sm.product_code = COALESCE(NULLIF(sm.product_code, ''), sp.product_code),
        sm.product_name = COALESCE(NULLIF(sm.product_name, ''), sp.product_name),
        sm.type = COALESCE(NULLIF(sm.type, ''), NULLIF(sm.movement_type, ''), ?),
        sm.movement_type = COALESCE(NULLIF(sm.movement_type, ''), NULLIF(sm.type, ''), ?)
      WHERE sm.product_id IS NOT NULL
        AND (
          sm.code IS NULL OR sm.code = ''
          OR sm.name IS NULL OR sm.name = ''
          OR sm.product_code IS NULL OR sm.product_code = ''
          OR sm.product_name IS NULL OR sm.product_name = ''
          OR sm.type IS NULL OR sm.type = ''
          OR sm.movement_type IS NULL OR sm.movement_type = ''
        )
    `, ['ปรับปรุง', 'ปรับปรุง']);
  } catch (e) {
    console.warn('[stockStorage] Migration update for stock_movements skipped due to schema mismatch', e.message);
  }
  try {
    const checkFk = await query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'stock_movements'
        AND CONSTRAINT_NAME = 'fk_stock_movements_product_id'
        AND TABLE_SCHEMA = DATABASE()
    `);
    if (checkFk.length > 0) {
      await ensureColumn('ALTER TABLE stock_movements DROP FOREIGN KEY fk_stock_movements_product_id');
    }
  } catch (e) {
    console.warn('[stockStorage] Failed to check/drop FK', e.message);
  }
  await ensureColumn('ALTER TABLE stock_movements MODIFY product_id VARCHAR(64) NULL');
  await ensureColumn(`ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_product_id
    FOREIGN KEY (product_id) REFERENCES stock_products(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL`);
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

export { cleanString, ensureIndex, query };
