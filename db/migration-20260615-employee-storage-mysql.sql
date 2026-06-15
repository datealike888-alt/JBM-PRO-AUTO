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
  UNIQUE KEY idx_employees_code (code(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(100) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(100) NULL DEFAULT 'working';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE employees ADD UNIQUE INDEX IF NOT EXISTS idx_employees_code (code(255));
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);

CREATE TABLE IF NOT EXISTS employee_positions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employee_positions_name (name(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_employee_positions_sort_order ON employee_positions(sort_order);

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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_status ON attendance_logs(status);

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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_leave_logs_employee_id ON leave_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_logs_date ON leave_logs(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_logs_end_date ON leave_logs(end_date);

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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_attendance_settings_employee_id ON attendance_settings(employee_id);

INSERT IGNORE INTO employees (id, code, name, role, active, status, first_name, last_name, nickname, position)
VALUES ('emp-default', 'jBm1679800329229#ProAuto!', 'JBM Admin', 'admin', 1, 'working', 'JBM', 'Admin', 'Admin', 'Owner');

INSERT IGNORE INTO employee_positions (id, name, sort_order, active) VALUES
  ('position-owner', 'เจ้าของอู่', 1, 1),
  ('position-manager', 'ผู้จัดการ', 2, 1),
  ('position-accounting', 'พนักงานบัญชี', 3, 1),
  ('position-stock', 'พนักงานสต็อก', 4, 1),
  ('position-mechanic', 'ช่าง', 5, 1);

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
