SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS jbm_pro_auto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jbm_pro_auto;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  receiptNo VARCHAR(100),
  ownerName VARCHAR(255),
  phone VARCHAR(64),
  plateNo VARCHAR(64),
  brand VARCHAR(128),
  model VARCHAR(256),
  color VARCHAR(128),
  status INT,
  statusText TEXT,
  entryDate DATE,
  bookingTime VARCHAR(32),
  estimatedCompletion DATE,
  mileage INT,
  cost INT,
  vin VARCHAR(128),
  receiptName VARCHAR(255),
  receiptUrl MEDIUMTEXT,
  logs JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vehicles_entry_date ON vehicles(entryDate);
CREATE INDEX idx_vehicles_entry_created ON vehicles(entryDate, createdAt);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_owner_name ON vehicles(ownerName(100));
CREATE INDEX idx_vehicles_phone ON vehicles(phone);
CREATE INDEX idx_vehicles_receipt_no ON vehicles(receiptNo);
CREATE INDEX idx_vehicles_plate_no ON vehicles(plateNo);

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
