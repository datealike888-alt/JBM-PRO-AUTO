SET NAMES utf8mb4;
USE jbm_pro_auto;

ALTER TABLE vehicles MODIFY COLUMN status VARCHAR(64) NOT NULL DEFAULT 'จองคิว';
ALTER TABLE vehicles ADD COLUMN invoice_number VARCHAR(100) NULL;
ALTER TABLE vehicles ADD COLUMN license_plate VARCHAR(64) NULL;
ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(255) NULL;
ALTER TABLE vehicles ADD COLUMN status_code INT NOT NULL DEFAULT 1;
ALTER TABLE vehicles ADD COLUMN status_note TEXT NULL;
ALTER TABLE vehicles ADD COLUMN repair_cost DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN appointment_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN received_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN due_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN delivered_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN note TEXT NULL;
ALTER TABLE vehicles ADD COLUMN image_path MEDIUMTEXT NULL;
ALTER TABLE vehicles ADD COLUMN image_name VARCHAR(255) NULL;
ALTER TABLE vehicles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE vehicles SET
  invoice_number = COALESCE(NULLIF(invoice_number, ''), receiptNo, id),
  license_plate = COALESCE(NULLIF(license_plate, ''), plateNo, ''),
  owner_name = COALESCE(owner_name, ownerName),
  status = CASE
    WHEN status IN ('1', 'จองคิว') THEN 'จองคิว'
    WHEN status IN ('2', 'เช็ครถ', 'กำลังตรวจเช็ค') THEN 'กำลังตรวจเช็ค'
    WHEN status IN ('3', 'รออะไหล่') THEN 'รออะไหล่'
    WHEN status IN ('4', 'กำลังซ่อม') THEN 'กำลังซ่อม'
    WHEN status IN ('5', 'เสร็จรอส่ง') THEN 'เสร็จรอส่ง'
    WHEN status IN ('6', 'ซ่อมเสร็จรอส่ง') THEN 'ซ่อมเสร็จรอส่ง'
    ELSE COALESCE(NULLIF(status, ''), 'จองคิว')
  END,
  status_note = COALESCE(status_note, statusText),
  repair_cost = COALESCE(NULLIF(repair_cost, 0), cost, 0),
  appointment_date = COALESCE(appointment_date, entryDate),
  received_date = COALESCE(received_date, entryDate),
  due_date = COALESCE(due_date, estimatedCompletion),
  image_path = COALESCE(image_path, receiptUrl),
  image_name = COALESCE(image_name, receiptName);

CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_phone ON vehicles(phone);
CREATE INDEX idx_vehicles_invoice_number ON vehicles(invoice_number);
CREATE INDEX idx_vehicles_status_new ON vehicles(status);
CREATE INDEX idx_vehicles_received_date ON vehicles(received_date);
