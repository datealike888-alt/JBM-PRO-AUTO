-- JBM PRO AUTO full production schema
-- Create/select the target database in phpMyAdmin first, then import this file.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active TINYINT(1) DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  INDEX idx_admin_sessions_user_id (user_id),
  INDEX idx_admin_sessions_expires_at (expires_at),
  INDEX idx_admin_sessions_revoked_at (revoked_at),
  CONSTRAINT fk_admin_sessions_user_id
    FOREIGN KEY (user_id) REFERENCES admin_users(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  invoice_number VARCHAR(100) NULL,
  license_plate VARCHAR(100) NULL,
  owner_name VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  car_brand VARCHAR(100) NULL,
  car_model VARCHAR(100) NULL,
  color VARCHAR(100) NULL,
  vin VARCHAR(100) NULL,
  mileage INT NULL,
  status VARCHAR(100) NULL,
  status_detail TEXT NULL,
  repair_cost DECIMAL(12,2) DEFAULT 0,
  entry_date DATE NULL,
  booking_time VARCHAR(50) NULL,
  estimated_completion DATE NULL,
  receipt_name VARCHAR(255) NULL,
  receipt_url TEXT NULL,
  brand VARCHAR(100) NULL,
  model VARCHAR(100) NULL,
  booking_date DATE NULL,
  estimated_completion_date DATE NULL,
  receipt_image MEDIUMTEXT NULL,
  receipt_images MEDIUMTEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vehicles_invoice_number (invoice_number),
  INDEX idx_vehicles_license_plate (license_plate),
  INDEX idx_vehicles_phone (phone),
  INDEX idx_vehicles_owner_name (owner_name),
  INDEX idx_vehicles_status (status),
  INDEX idx_vehicles_entry_date (entry_date),
  INDEX idx_vehicles_booking_date (booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_receipts (
  id VARCHAR(64) PRIMARY KEY,
  vehicle_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NULL,
  file_url TEXT NULL,
  mime_type VARCHAR(100) NULL,
  file_size INT NULL,
  uploaded_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_receipts_vehicle_id (vehicle_id),
  CONSTRAINT fk_vehicle_receipts_vehicle_id
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_transactions (
  id VARCHAR(64) PRIMARY KEY,
  transaction_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(100) NULL,
  receipt_image_url TEXT NULL,
  related_vehicle_id VARCHAR(64) NULL,
  note TEXT NULL,
  date DATE NULL,
  time TIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_financial_transactions_transaction_date (transaction_date),
  INDEX idx_financial_transactions_type (type),
  INDEX idx_financial_transactions_category (category),
  INDEX idx_financial_transactions_related_vehicle_id (related_vehicle_id),
  CONSTRAINT fk_financial_transactions_related_vehicle_id
    FOREIGN KEY (related_vehicle_id) REFERENCES vehicles(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_debts (
  id VARCHAR(64) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  case_reference VARCHAR(255) NULL,
  total_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(64) NULL,
  due_date DATE NULL,
  payment_method VARCHAR(100) NULL,
  description TEXT NULL,
  note TEXT NULL,
  receipt_image_url TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_debts_status (status),
  INDEX idx_payment_debts_due_date (due_date),
  INDEX idx_payment_debts_customer_name (customer_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_debt_payments (
  id VARCHAR(64) PRIMARY KEY,
  debt_id VARCHAR(64) NOT NULL,
  payment_date DATE NOT NULL,
  payment_time TIME NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(100) NULL,
  note TEXT NULL,
  receipt_image_url TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_debt_payments_debt_id (debt_id),
  INDEX idx_payment_debt_payments_date (payment_date),
  CONSTRAINT fk_payment_debt_payments_debt_id
    FOREIGN KEY (debt_id) REFERENCES payment_debts(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(64) PRIMARY KEY,
  employee_code VARCHAR(100) NOT NULL,
  code VARCHAR(255) NULL,
  name VARCHAR(255) NULL,
  role VARCHAR(100) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  nickname VARCHAR(100) NULL,
  position VARCHAR(100) NULL,
  phone VARCHAR(50) NULL,
  status VARCHAR(50) DEFAULT 'ทำงานอยู่',
  start_date DATE NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employees_employee_code (employee_code),
  INDEX idx_employees_status (status),
  INDEX idx_employees_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_positions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employee_positions_name (name),
  INDEX idx_employee_positions_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_attendance (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  work_date DATE NOT NULL,
  check_in_time TIME NULL,
  lunch_out_time TIME NULL,
  lunch_in_time TIME NULL,
  check_out_time TIME NULL,
  status VARCHAR(100) NULL,
  total_hours DECIMAL(5,2) DEFAULT 0,
  ot_hours DECIMAL(5,2) DEFAULT 0,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employee_attendance_unique (employee_id, work_date),
  INDEX idx_employee_attendance_work_date (work_date),
  INDEX idx_employee_attendance_status (status),
  CONSTRAINT fk_employee_attendance_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_leaves (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  leave_type VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  total_days DECIMAL(5,2) DEFAULT 0,
  leave_duration_type VARCHAR(50) NOT NULL DEFAULT 'full_day',
  leave_days DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  reason TEXT NULL,
  approver VARCHAR(255) NULL,
  status VARCHAR(50) DEFAULT 'รออนุมัติ',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_leaves_employee_id (employee_id),
  INDEX idx_employee_leaves_start_date (start_date),
  INDEX idx_employee_leaves_status (status),
  CONSTRAINT fk_employee_leaves_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_settings (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NULL,
  morning_start TIME NULL,
  morning_late_after TIME NULL,
  lunch_out TIME NULL,
  afternoon_start TIME NULL,
  afternoon_late_after TIME NULL,
  work_end TIME NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'api',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_settings_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  product_code VARCHAR(100) NULL,
  product_name VARCHAR(255) NOT NULL,
  product_number VARCHAR(100) NULL,
  category_id VARCHAR(64) NULL,
  product_brand VARCHAR(100) NULL,
  car_brand VARCHAR(100) NULL,
  car_model VARCHAR(100) NULL,
  engine_number VARCHAR(100) NULL,
  price DECIMAL(12,2) DEFAULT 0,
  storage_location VARCHAR(255) NULL,
  quantity INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  supplier VARCHAR(255) NULL,
  status VARCHAR(50) NULL,
  image_url TEXT NULL,
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

CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NULL,
  setting_type VARCHAR(50) NULL,
  description TEXT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(64) NULL,
  detail TEXT NULL,
  created_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_created_at (created_at),
  INDEX idx_audit_logs_module (module),
  INDEX idx_audit_logs_entity_id (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
