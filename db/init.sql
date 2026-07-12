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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  date DATE NULL,
  time TIME NULL,
  transaction_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  cost_amount DECIMAL(12,2) NULL DEFAULT NULL,
  vat_amount DECIMAL(12,2) NULL DEFAULT NULL,
  before_vat_3_percent DECIMAL(12,2) NULL DEFAULT 0,
  profit_amount DECIMAL(12,2) NULL DEFAULT NULL,
  payment_method VARCHAR(100) NULL,
  receipt_image_url TEXT NULL,
  related_vehicle_id VARCHAR(64) NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_financial_transactions_transaction_date (transaction_date),
  INDEX idx_financial_transactions_type (type),
  INDEX idx_financial_transactions_category (category),
  INDEX idx_financial_transactions_related_vehicle_id (related_vehicle_id),
  INDEX idx_financial_transactions_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_reserve_transactions (
  id VARCHAR(64) PRIMARY KEY,
  transaction_date DATE NOT NULL,
  transaction_time TIME NULL,
  type VARCHAR(50) NOT NULL,
  detail TEXT NOT NULL,
  vehicle_ref VARCHAR(255) NULL,
  case_ref VARCHAR(255) NULL,
  person_name VARCHAR(255) NULL,
  payment_channel VARCHAR(100) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  direction VARCHAR(20) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  receipt_image_url TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cash_reserve_transactions_transaction_date (transaction_date),
  INDEX idx_cash_reserve_transactions_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_payables (
  id VARCHAR(64) PRIMARY KEY,
  transaction_date DATE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'รอจ่าย',
  paid_date DATE NULL,
  slip_url TEXT NULL,
  note TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_payables_status (status),
  INDEX idx_supplier_payables_company_name (company_name),
  INDEX idx_supplier_payables_transaction_date (transaction_date),
  INDEX idx_supplier_payables_updated_at (updated_at)
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
  receipt_images TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  receipt_images TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_debt_payments_debt_id (debt_id),
  INDEX idx_payment_debt_payments_date (payment_date),
  CONSTRAINT fk_payment_debt_payments_debt_id
    FOREIGN KEY (debt_id) REFERENCES payment_debts(id)
    ON UPDATE CASCADE
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
