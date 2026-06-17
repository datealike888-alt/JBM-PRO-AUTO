CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NULL,
  role VARCHAR(100) NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO admin_users (id, username, password_hash, display_name, role, is_active)
VALUES (
  'admin-default',
  'admin',
  '$2b$10$6rpKbC.rrjjMdh6QPq8G2uB0qShD1WElKrKNS7fR8ZILRbg8jpQGK',
  'JBM Admin',
  'admin',
  1
);

CREATE TABLE IF NOT EXISTS stock_categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_stock_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_products (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  part_no VARCHAR(255) NULL,
  category VARCHAR(255) NULL,
  brand VARCHAR(255) NULL,
  car_models TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  location VARCHAR(255) NULL,
  quantity INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 0,
  supplier VARCHAR(255) NULL,
  engine_number VARCHAR(255) NULL,
  image_url TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_stock_products_code (code),
  INDEX idx_stock_products_name (name),
  INDEX idx_stock_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  code VARCHAR(100) NULL,
  name VARCHAR(255) NULL,
  type VARCHAR(100) NOT NULL,
  quantity_change INT NOT NULL DEFAULT 0,
  quantity_before INT NOT NULL DEFAULT 0,
  quantity_after INT NOT NULL DEFAULT 0,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_movements_product_id (product_id),
  INDEX idx_stock_movements_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
