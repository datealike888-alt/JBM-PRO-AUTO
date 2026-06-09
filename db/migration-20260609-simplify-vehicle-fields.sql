SET NAMES utf8mb4;
USE jbm_pro_auto;

UPDATE vehicles SET
  invoice_number = COALESCE(invoice_number, receiptNo),
  license_plate = COALESCE(license_plate, plateNo),
  owner_name = COALESCE(owner_name, ownerName),
  booking_date = COALESCE(booking_date, appointment_date, entryDate),
  estimated_completion_date = COALESCE(estimated_completion_date, due_date, estimatedCompletion),
  status_detail = COALESCE(status_detail, status_note, statusText),
  receipt_image = COALESCE(receipt_image, image_path, receiptUrl),
  repair_cost = COALESCE(repair_cost, cost, 0),
  status = CASE
    WHEN status IN ('1', 'จองคิว') THEN 'จองคิว'
    WHEN status IN ('2', 'เช็ครถ', 'กำลังตรวจเช็ค') THEN 'กำลังตรวจเช็ค'
    WHEN status IN ('3', 'รออะไหล่') THEN 'รออะไหล่'
    WHEN status IN ('4', 'กำลังซ่อม') THEN 'กำลังซ่อม'
    WHEN status IN ('5', 'เสร็จรอส่ง', 'ซ่อมเสร็จรอส่ง') THEN 'ซ่อมเสร็จรอส่ง'
    ELSE COALESCE(NULLIF(status, ''), 'จองคิว')
  END;

ALTER TABLE vehicles DROP COLUMN IF EXISTS received_date;
ALTER TABLE vehicles DROP COLUMN IF EXISTS delivered_date;
ALTER TABLE vehicles DROP COLUMN IF EXISTS note;
ALTER TABLE vehicles DROP COLUMN IF EXISTS status_note;
ALTER TABLE vehicles DROP COLUMN IF EXISTS image_path;
ALTER TABLE vehicles DROP COLUMN IF EXISTS image_name;
ALTER TABLE vehicles DROP COLUMN IF EXISTS appointment_date;
ALTER TABLE vehicles DROP COLUMN IF EXISTS due_date;
ALTER TABLE vehicles DROP COLUMN IF EXISTS receiptNo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS ownerName;
ALTER TABLE vehicles DROP COLUMN IF EXISTS plateNo;
ALTER TABLE vehicles DROP COLUMN IF EXISTS statusText;
ALTER TABLE vehicles DROP COLUMN IF EXISTS entryDate;
ALTER TABLE vehicles DROP COLUMN IF EXISTS bookingTime;
ALTER TABLE vehicles DROP COLUMN IF EXISTS estimatedCompletion;
ALTER TABLE vehicles DROP COLUMN IF EXISTS cost;
ALTER TABLE vehicles DROP COLUMN IF EXISTS receiptName;
ALTER TABLE vehicles DROP COLUMN IF EXISTS receiptUrl;
ALTER TABLE vehicles DROP COLUMN IF EXISTS createdAt;
ALTER TABLE vehicles DROP COLUMN IF EXISTS status_code;
ALTER TABLE vehicles DROP COLUMN IF EXISTS logs;
