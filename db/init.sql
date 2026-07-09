SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS jbm_pro_auto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jbm_pro_auto;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  invoice_number VARCHAR(100) NULL,
  license_plate VARCHAR(64) NULL,
  owner_name VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  brand VARCHAR(128) NULL,
  model VARCHAR(256) NULL,
  color VARCHAR(128) NULL,
  vin VARCHAR(128) NULL,
  mileage INT NULL,
  status VARCHAR(64) NULL DEFAULT 'จองคิว',
  repair_cost DECIMAL(12,2) NULL DEFAULT 0,
  booking_date DATE NULL,
  estimated_completion_date DATE NULL,
  status_detail TEXT NULL,
  receipt_image MEDIUMTEXT NULL,
  receipt_images MEDIUMTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vehicles_invoice_number (invoice_number),
  INDEX idx_vehicles_license_plate (license_plate),
  INDEX idx_vehicles_owner_name (owner_name),
  INDEX idx_vehicles_phone (phone),
  INDEX idx_vehicles_vin (vin),
  INDEX idx_vehicles_status (status),
  INDEX idx_vehicles_booking_date (booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255) NULL,
  role VARCHAR(100) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(100) NULL DEFAULT 'working',
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  nickname VARCHAR(255) NULL,
  position VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employees_code (code(255)),
  INDEX idx_employees_status (status),
  INDEX idx_employees_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO employees (id, code, name, role, active, status, first_name, last_name, nickname, position)
VALUES ('emp-default', 'jBm1679800329229#ProAuto!', 'JBM Admin', 'admin', 1, 'working', 'JBM', 'Admin', 'Admin', 'Owner');

CREATE TABLE IF NOT EXISTS employee_positions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employee_positions_name (name(255)),
  INDEX idx_employee_positions_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO employee_positions (id, name, sort_order, active) VALUES
  ('position-owner', 'เจ้าของอู่', 1, 1),
  ('position-manager', 'ผู้จัดการ', 2, 1),
  ('position-accounting', 'พนักงานบัญชี', 3, 1),
  ('position-stock', 'พนักงานสต็อก', 4, 1),
  ('position-mechanic', 'ช่าง', 5, 1);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  employee_code VARCHAR(255) NULL,
  date DATE NOT NULL,
  morning_in TIME NULL,
  lunch_out TIME NULL,
  afternoon_in TIME NULL,
  evening_out TIME NULL,
  method VARCHAR(100) NULL,
  status VARCHAR(100) NULL,
  hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  source VARCHAR(32) NOT NULL DEFAULT 'api',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_logs_employee_id (employee_id),
  INDEX idx_attendance_logs_date (date),
  INDEX idx_attendance_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_logs (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  employee_code VARCHAR(255) NULL,
  type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(10,2) NOT NULL DEFAULT 0,
  approver VARCHAR(255) NULL,
  reason TEXT NULL,
  submitted_at DATE NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'api',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leave_logs_employee_id (employee_id),
  INDEX idx_leave_logs_date (start_date),
  INDEX idx_leave_logs_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS employee_incomes (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  type VARCHAR(100) NOT NULL,
  custom_type VARCHAR(100) NULL,
  work_date DATE NOT NULL,
  title VARCHAR(255) NULL,
  detail TEXT NULL,
  note TEXT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL,
  overtime_start_time TIME NULL,
  overtime_end_time TIME NULL,
  overtime_hours DECIMAL(6,2) NULL,
  overtime_rate_type VARCHAR(50) NULL,
  overtime_rate DECIMAL(8,2) NULL,
  hourly_wage DECIMAL(10,2) NULL,
  overtime_reason TEXT NULL,
  repair_reference VARCHAR(255) NULL,
  license_plate VARCHAR(100) NULL,
  customer_name VARCHAR(255) NULL,
  commission_base DECIMAL(12,2) NULL,
  commission_percent DECIMAL(8,2) NULL,
  calculation_note TEXT NULL,
  source_type VARCHAR(100) NULL,
  source_id VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_incomes_employee_id (employee_id),
  INDEX idx_employee_incomes_work_date (work_date),
  INDEX idx_employee_incomes_type (type),
  INDEX idx_employee_incomes_status (status),
  CONSTRAINT fk_employee_incomes_employee_id
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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_settings_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO attendance_settings (
  id, employee_id, morning_start, morning_late_after, lunch_out, afternoon_start, afternoon_late_after, work_end, source
) VALUES (
  'attendance-settings-default',
  NULL,
  '09:00:00',
  '09:06:00',
  '12:30:00',
  '13:30:00',
  '13:31:00',
  '18:00:00',
  'seed'
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id VARCHAR(64) PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NULL,
  type ENUM('income','expense') NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_amount DECIMAL(12,2) NULL DEFAULT NULL,
  vat_amount DECIMAL(12,2) NULL DEFAULT NULL,
  profit_amount DECIMAL(12,2) NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_financial_transactions_date (date),
  INDEX idx_financial_transactions_type (type),
  INDEX idx_financial_transactions_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
