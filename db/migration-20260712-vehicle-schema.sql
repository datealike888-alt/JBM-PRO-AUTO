-- Migration: 20260712-vehicle-schema
-- Description: Consolidates runtime DDL for vehicles and vehicle_receipts

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
  booking_time TIME NULL,
  estimated_completion_date DATE NULL,
  status_detail TEXT NULL,
  receipt_image MEDIUMTEXT NULL,
  receipt_images MEDIUMTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Emulate the runtime ALTER statements
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate VARCHAR(64) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS phone VARCHAR(64) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand VARCHAR(128) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(256) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(128) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin VARCHAR(128) NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INT NULL;
ALTER TABLE vehicles MODIFY COLUMN status VARCHAR(64) NULL DEFAULT 'จองคิว';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS repair_cost DECIMAL(12,2) NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS booking_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS booking_time TIME NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS estimated_completion_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status_detail TEXT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS receipt_image MEDIUMTEXT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS receipt_images MEDIUMTEXT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Emulate runtime UPDATE
UPDATE vehicles SET
  status = CASE
    WHEN status IN ('1', 'จองคิว') THEN 'จองคิว'
    WHEN status IN ('2', 'เช็ครถ', 'กำลังตรวจเช็ค') THEN 'กำลังตรวจเช็ค'
    WHEN status IN ('3', 'รออะไหล่') THEN 'รออะไหล่'
    WHEN status IN ('4', 'กำลังซ่อม') THEN 'กำลังซ่อม'
    WHEN status IN ('5', 'ซ่อมเสร็จรอส่ง') THEN 'ซ่อมเสร็จรอส่ง'
    WHEN status IN ('6', 'ปิดงาน') THEN 'ปิดงาน'
    ELSE COALESCE(NULLIF(status, ''), 'จองคิว')
  END,
  repair_cost = COALESCE(repair_cost, 0);

-- Emulate runtime INDEX creation (USING CREATE INDEX IF NOT EXISTS syntax available in MariaDB 10.6.14+ / MySQL 8.0,
-- or we rely on the DB admin to ignore 1061 errors as it was done in runtime)
-- Using standard CREATE INDEX but without IF NOT EXISTS because it might not be supported on older MySQL.
-- In production runbook, manual import might throw 1061.
-- However, we can just write them. If it's a fresh install it won't fail.
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_phone ON vehicles(phone);
CREATE INDEX idx_vehicles_invoice_number ON vehicles(invoice_number);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_booking_date ON vehicles(booking_date);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);


CREATE TABLE IF NOT EXISTS vehicle_receipts (
  id VARCHAR(64) PRIMARY KEY,
  vehicle_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NULL,
  file_url TEXT NULL,
  mime_type VARCHAR(100) NULL,
  file_size INT NULL,
  uploaded_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_receipts_vehicle_id (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
