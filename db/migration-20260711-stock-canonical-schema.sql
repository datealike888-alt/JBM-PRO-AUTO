-- Align stock runtime schema with the canonical stock tables used by the stock APIs.
-- Safe for existing databases: creates missing tables, adds missing columns, and copies alias data.
-- This migration does not DROP, TRUNCATE, or DELETE stock data.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS stock_categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_stock_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX idx_stock_products_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NULL,
  code VARCHAR(100) NULL,
  name VARCHAR(255) NULL,
  type VARCHAR(50) NULL,
  product_code VARCHAR(100) NULL,
  product_name VARCHAR(255) NULL,
  movement_type VARCHAR(50) NULL,
  quantity_change INT NOT NULL DEFAULT 0,
  quantity_before INT DEFAULT 0,
  quantity_after INT DEFAULT 0,
  note TEXT NULL,
  created_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_movements_product_id (product_id),
  INDEX idx_stock_movements_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stock_categories ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE stock_categories ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;
ALTER TABLE stock_categories ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE stock_categories ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE stock_categories ADD UNIQUE INDEX IF NOT EXISTS idx_stock_categories_name (name);

ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS code VARCHAR(100) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS product_code VARCHAR(100) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS part_no VARCHAR(100) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS category_id VARCHAR(64) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS category VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS car_models VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS compatible_models VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS engine_code VARCHAR(100) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 0;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS reorder_point INT DEFAULT 0;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 0;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS supplier VARCHAR(255) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS status VARCHAR(50) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS image_url TEXT NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS note TEXT NULL;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE stock_products ADD UNIQUE INDEX IF NOT EXISTS idx_stock_products_code (product_code);
ALTER TABLE stock_products ADD INDEX IF NOT EXISTS idx_stock_products_name (product_name);
ALTER TABLE stock_products ADD INDEX IF NOT EXISTS idx_stock_products_category_id (category_id);

UPDATE stock_products
SET
  product_code = COALESCE(NULLIF(product_code, ''), NULLIF(code, '')),
  code = COALESCE(NULLIF(code, ''), NULLIF(product_code, '')),
  product_name = COALESCE(NULLIF(product_name, ''), NULLIF(name, '')),
  name = COALESCE(NULLIF(name, ''), NULLIF(product_name, '')),
  compatible_models = COALESCE(NULLIF(compatible_models, ''), NULLIF(car_models, '')),
  car_models = COALESCE(NULLIF(car_models, ''), NULLIF(compatible_models, '')),
  engine_code = COALESCE(NULLIF(engine_code, ''), NULLIF(engine_number, '')),
  sale_price = COALESCE(sale_price, price),
  min_stock = COALESCE(NULLIF(min_stock, 0), reorder_point);

SET @has_stock_product_number = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_products' AND COLUMN_NAME = 'product_number'
);
SET @copy_stock_product_number_sql = IF(
  @has_stock_product_number > 0,
  'UPDATE stock_products SET part_no = COALESCE(NULLIF(part_no, ''''), NULLIF(product_number, '''')) WHERE part_no IS NULL OR part_no = ''''',
  'SELECT 1'
);
PREPARE copy_stock_product_number_stmt FROM @copy_stock_product_number_sql;
EXECUTE copy_stock_product_number_stmt;
DEALLOCATE PREPARE copy_stock_product_number_stmt;

SET @has_stock_product_brand = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_products' AND COLUMN_NAME = 'product_brand'
);
SET @copy_stock_product_brand_sql = IF(
  @has_stock_product_brand > 0,
  'UPDATE stock_products SET brand = COALESCE(NULLIF(brand, ''''), NULLIF(product_brand, '''')) WHERE brand IS NULL OR brand = ''''',
  'SELECT 1'
);
PREPARE copy_stock_product_brand_stmt FROM @copy_stock_product_brand_sql;
EXECUTE copy_stock_product_brand_stmt;
DEALLOCATE PREPARE copy_stock_product_brand_stmt;

SET @has_stock_car_model = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_products' AND COLUMN_NAME = 'car_model'
);
SET @copy_stock_car_model_sql = IF(
  @has_stock_car_model > 0,
  'UPDATE stock_products SET car_models = COALESCE(NULLIF(car_models, ''''), NULLIF(car_model, '''')) WHERE car_models IS NULL OR car_models = ''''',
  'SELECT 1'
);
PREPARE copy_stock_car_model_stmt FROM @copy_stock_car_model_sql;
EXECUTE copy_stock_car_model_stmt;
DEALLOCATE PREPARE copy_stock_car_model_stmt;

SET @has_stock_storage_location = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_products' AND COLUMN_NAME = 'storage_location'
);
SET @copy_stock_storage_location_sql = IF(
  @has_stock_storage_location > 0,
  'UPDATE stock_products SET location = COALESCE(NULLIF(location, ''''), NULLIF(storage_location, '''')) WHERE location IS NULL OR location = ''''',
  'SELECT 1'
);
PREPARE copy_stock_storage_location_stmt FROM @copy_stock_storage_location_sql;
EXECUTE copy_stock_storage_location_stmt;
DEALLOCATE PREPARE copy_stock_storage_location_stmt;

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_id VARCHAR(64) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS code VARCHAR(100) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS type VARCHAR(50) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_code VARCHAR(100) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_type VARCHAR(50) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_change INT NOT NULL DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_before INT DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_after INT DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS note TEXT NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE stock_movements MODIFY COLUMN product_id VARCHAR(64) NULL;
ALTER TABLE stock_movements ADD INDEX IF NOT EXISTS idx_stock_movements_product_id (product_id);
ALTER TABLE stock_movements ADD INDEX IF NOT EXISTS idx_stock_movements_created_at (created_at);

SET @has_stock_movement_quantity = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'quantity'
);
SET @copy_stock_movement_quantity_sql = IF(
  @has_stock_movement_quantity > 0,
  'UPDATE stock_movements SET quantity_change = COALESCE(NULLIF(quantity_change, 0), quantity)',
  'SELECT 1'
);
PREPARE copy_stock_movement_quantity_stmt FROM @copy_stock_movement_quantity_sql;
EXECUTE copy_stock_movement_quantity_stmt;
DEALLOCATE PREPARE copy_stock_movement_quantity_stmt;

UPDATE stock_movements sm
LEFT JOIN stock_products sp ON sp.id = sm.product_id
SET
  sm.code = COALESCE(NULLIF(sm.code, ''), NULLIF(sm.product_code, ''), sp.code, sp.product_code),
  sm.name = COALESCE(NULLIF(sm.name, ''), NULLIF(sm.product_name, ''), sp.name, sp.product_name),
  sm.product_code = COALESCE(NULLIF(sm.product_code, ''), sm.code, sp.product_code, sp.code),
  sm.product_name = COALESCE(NULLIF(sm.product_name, ''), sm.name, sp.product_name, sp.name),
  sm.type = COALESCE(NULLIF(sm.type, ''), NULLIF(sm.movement_type, ''), 'ปรับปรุง'),
  sm.movement_type = COALESCE(NULLIF(sm.movement_type, ''), NULLIF(sm.type, ''), 'ปรับปรุง');

-- Rollback guidance: this migration only adds columns/tables and copies aliases.
-- To revert application behavior, deploy the previous source and keep the added columns until backups are validated.
