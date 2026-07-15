-- JBM PRO AUTO clean production seed
-- Import this file into the database you already selected in phpMyAdmin.
SET NAMES utf8mb4;

INSERT IGNORE INTO employee_positions (id, name, sort_order, active) VALUES
('position-owner', 'เจ้าของอู่', 1, 1),
('position-manager', 'ผู้จัดการ', 2, 1),
('position-accounting', 'พนักงานบัญชี', 3, 1),
('position-stock', 'พนักงานสต๊อก', 4, 1),
('position-mechanic', 'ช่าง', 5, 1);

INSERT IGNORE INTO stock_categories (id, name, description, is_active) VALUES
('cat-engine-oil', 'น้ำมันเครื่อง', 'ของเหลวสำหรับบำรุงรักษาเครื่องยนต์', 1),
('cat-filter', 'กรอง', 'ไส้กรองและอุปกรณ์กรอง', 1),
('cat-brake', 'เบรก', 'ผ้าเบรก จานเบรก และอะไหล่ระบบเบรก', 1),
('cat-suspension', 'ช่วงล่าง', 'อะไหล่ระบบช่วงล่าง', 1),
('cat-electrical', 'ระบบไฟ', 'แบตเตอรี่ หลอดไฟ และอุปกรณ์ไฟฟ้า', 1);

INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('shop_name', 'JBM PRO AUTO', 'string', 'ชื่อร้าน'),
('phone', '099 265 1133', 'string', 'เบอร์โทรร้าน'),
('line', '@JBMPRO', 'string', 'Line Official'),
('facebook', 'JBM Pro Auto', 'string', 'Facebook'),
('instagram', 'JBM.PRO.AUTO', 'string', 'Instagram'),
('address', '616/1 ซอยพัฒนาการ 30 แขวงสวนหลวง เขตสวนหลวง กรุงเทพมหานคร 10250', 'string', 'ที่อยู่ร้าน');
