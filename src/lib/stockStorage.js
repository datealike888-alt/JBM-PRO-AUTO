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
    if (![1005, 1060, 1061, 1062, 1091, 1215, 1826].includes(Number(error?.errno || 0))) throw error;
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
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN product_code VARCHAR(100) NULL');
  await ensureColumn('ALTER TABLE stock_movements ADD COLUMN product_name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE stock_movements CHANGE COLUMN quantity quantity_change INT NOT NULL');
  try {
    await query(`
      UPDATE stock_movements sm
      LEFT JOIN stock_products sp ON sp.id = sm.product_id
      SET
        sm.product_code = COALESCE(NULLIF(sm.product_code, ''), sp.product_code),
        sm.product_name = COALESCE(NULLIF(sm.product_name, ''), sp.product_name)
      WHERE sm.product_id IS NOT NULL
        AND (
          sm.product_code IS NULL OR sm.product_code = ''
          OR sm.product_name IS NULL OR sm.product_name = ''
        )
    `);
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
  return {
    id: cleanString(body.id, 64) || `stk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productCode: cleanNullable(body.code || body.product_code, 100),
    productName: cleanString(body.name || body.product_name, 255),
    productNumber: cleanNullable(body.part_no || body.product_number, 100),
    categoryId: cleanNullable(body.category_id, 64),
    categoryName: cleanString(body.category || body.category_name, 255),
    productBrand: cleanNullable(body.brand || body.product_brand, 100),
    carBrand: cleanNullable(body.car_brand, 100),
    carModel: cleanNullable(body.car_models || body.car_model, 100),
    engineNumber: cleanNullable(body.engine_number, 100),
    price: Math.max(0, normalizeNumber(body.price, 0)),
    storageLocation: cleanNullable(body.location || body.storage_location, 255),
    quantity: Math.max(0, Math.trunc(normalizeNumber(body.quantity, 0))),
    reorderPoint: Math.max(0, Math.trunc(normalizeNumber(body.reorder_point, 0))),
    supplier: cleanNullable(body.supplier, 255),
    status: cleanNullable(body.status, 50),
    imageUrl,
    note: cleanNullable(body.note, 5000),
  };
}

export function normalizeStockProductRow(row) {
  return {
    id: row.id,
    code: row.product_code || '',
    name: row.product_name || '',
    part_no: row.product_number || '',
    category: row.category_name || '',
    brand: row.product_brand || '',
    car_models: row.car_model || '',
    location: row.storage_location || '',
    product_code: row.product_code || '',
    product_name: row.product_name || '',
    product_number: row.product_number || '',
    category_id: row.category_id || '',
    category_name: row.category_name || '',
    product_brand: row.product_brand || '',
    car_brand: row.car_brand || '',
    car_model: row.car_model || '',
    engine_number: row.engine_number || '',
    price: Number(row.price || 0),
    storage_location: row.storage_location || '',
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
  const productCode = cleanNullable(body.code || body.product_code || body.productCode, 100);
  const productName = cleanNullable(body.name || body.product_name || body.productName, 255);
  return {
    id: cleanString(body.id, 64) || `stock-move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: cleanString(body.product_id || body.productId, 64),
    productCode,
    productName,
    movementType: cleanString(body.type || body.movement_type || body.movementType, 50) || 'ADJUST',
    quantityChange: Math.trunc(normalizeNumber(body.quantity_change ?? body.quantity ?? body.quantityChange, 0)),
    quantityBefore: Math.trunc(normalizeNumber(body.quantity_before || body.quantityBefore, 0)),
    quantityAfter: Math.trunc(normalizeNumber(body.quantity_after || body.quantityAfter, 0)),
    note: cleanNullable(body.note, 5000),
    createdBy: cleanNullable(body.created_by || body.createdBy, 100),
  };
}

export function normalizeStockMovementRow(row) {
  return {
    id: row.id,
    type: row.movement_type || '',
    quantity_change: Number(row.quantity_change ?? row.quantity ?? 0),
    product_id: row.product_id,
    movement_type: row.movement_type || '',
    quantity: Number(row.quantity_change ?? row.quantity ?? 0),
    quantity_before: Number(row.quantity_before || 0),
    quantity_after: Number(row.quantity_after || 0),
    code: row.product_code || '',
    name: row.product_name || '',
    product_code: row.product_code || '',
    product_name: row.product_name || '',
    note: row.note || '',
    created_by: row.created_by || '',
    created_at: row.created_at || null,
  };
}

export { cleanString, ensureIndex, query };
