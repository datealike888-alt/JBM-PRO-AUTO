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

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(100),
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employees_code (code(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO employees (id, code, name, role, active)
VALUES ('emp-001', 'jBm1679800329229#ProAuto!', 'พนักงานอู่', 'admin', 1);
