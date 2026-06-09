SET NAMES utf8mb4;
USE jbm_pro_auto;

ALTER TABLE vehicles ADD COLUMN invoice_number VARCHAR(100) NULL;
ALTER TABLE vehicles ADD COLUMN license_plate VARCHAR(64) NULL;
ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(255) NULL;
ALTER TABLE vehicles ADD COLUMN phone VARCHAR(64) NULL;
ALTER TABLE vehicles ADD COLUMN brand VARCHAR(128) NULL;
ALTER TABLE vehicles ADD COLUMN model VARCHAR(256) NULL;
ALTER TABLE vehicles ADD COLUMN color VARCHAR(128) NULL;
ALTER TABLE vehicles ADD COLUMN vin VARCHAR(128) NULL;
ALTER TABLE vehicles ADD COLUMN mileage INT NULL;
ALTER TABLE vehicles MODIFY COLUMN status VARCHAR(64) NULL DEFAULT 'จองคิว';
ALTER TABLE vehicles ADD COLUMN repair_cost DECIMAL(12,2) NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN booking_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN estimated_completion_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN status_detail TEXT NULL;
ALTER TABLE vehicles ADD COLUMN receipt_image MEDIUMTEXT NULL;
ALTER TABLE vehicles ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE vehicles SET
  invoice_number = COALESCE(invoice_number, receiptNo),
  license_plate = COALESCE(license_plate, plateNo),
  owner_name = COALESCE(owner_name, ownerName),
  status = CASE
    WHEN status IN ('1', 'จองคิว') THEN 'จองคิว'
    WHEN status IN ('2', 'เช็ครถ', 'กำลังตรวจเช็ค') THEN 'กำลังตรวจเช็ค'
    WHEN status IN ('3', 'รออะไหล่') THEN 'รออะไหล่'
    WHEN status IN ('4', 'กำลังซ่อม') THEN 'กำลังซ่อม'
    WHEN status IN ('5', 'เสร็จรอส่ง', 'ซ่อมเสร็จรอส่ง') THEN 'ซ่อมเสร็จรอส่ง'
    ELSE COALESCE(NULLIF(status, ''), 'จองคิว')
  END,
  repair_cost = COALESCE(repair_cost, cost, 0),
  booking_date = COALESCE(booking_date, appointment_date, entryDate),
  estimated_completion_date = COALESCE(estimated_completion_date, due_date, estimatedCompletion),
  status_detail = COALESCE(status_detail, status_note, statusText),
  receipt_image = COALESCE(receipt_image, image_path, receiptUrl);

CREATE INDEX idx_vehicles_invoice_number ON vehicles(invoice_number);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_owner_name ON vehicles(owner_name);
CREATE INDEX idx_vehicles_phone ON vehicles(phone);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_booking_date ON vehicles(booking_date);
