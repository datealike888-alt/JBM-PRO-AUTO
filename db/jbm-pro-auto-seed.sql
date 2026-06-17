-- JBM PRO AUTO clean production seed
-- Import this file into the database you already selected in phpMyAdmin.
SET NAMES utf8mb4;

INSERT IGNORE INTO admin_users (id, username, password_hash, display_name, role, is_active)
VALUES ('admin-default', 'admin', '$2b$10$Q.j8aoN2.6Zc6kgCYv082uw7k1IUQUW.TLGNnRc73o5P1zZgHEbGa', 'JBM Admin', 'admin', 1);

INSERT IGNORE INTO employee_positions (id, name, sort_order, active) VALUES
('position-owner', 'เจ้าของอู่', 1, 1),
('position-manager', 'ผู้จัดการ', 2, 1),
('position-accounting', 'พนักงานบัญชี', 3, 1),
('position-stock', 'พนักงานสต๊อก', 4, 1),
('position-mechanic', 'ช่าง', 5, 1);

INSERT IGNORE INTO employees (id, employee_code, first_name, last_name, nickname, position, phone, status, start_date, note) VALUES
('emp-owner', 'EMP001', 'JBM', 'Owner', 'เจบีเอ็ม', 'เจ้าของอู่', '0992651133', 'ทำงานอยู่', '2024-01-01', 'ผู้ดูแลระบบ'),
('emp-manager', 'EMP002', 'Somchai', 'Manager', 'ชาย', 'ผู้จัดการ', '0811111111', 'ทำงานอยู่', '2024-01-10', NULL),
('emp-accounting', 'EMP003', 'Suda', 'Accounting', 'ดา', 'พนักงานบัญชี', '0822222222', 'ทำงานอยู่', '2024-02-01', NULL),
('emp-stock', 'EMP004', 'Narin', 'Stock', 'นรินทร์', 'พนักงานสต๊อก', '0833333333', 'ทำงานอยู่', '2024-02-15', NULL),
('emp-mechanic-1', 'EMP005', 'Anan', 'Mechanic', 'อนันต์', 'ช่าง', '0844444444', 'ทำงานอยู่', '2024-03-01', NULL),
('emp-mechanic-2', 'EMP006', 'Prasit', 'Technician', 'สิทธิ์', 'ช่าง', '0855555555', 'ทำงานอยู่', '2024-03-15', NULL);

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
