-- Migration: 20260712-employee-schema
-- Description: Consolidates runtime DDL for employees, positions, attendance, leaves, incomes, and settings
-- Includes Explicit Reference-data Seed for default positions and settings

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(64) PRIMARY KEY,
  employee_code VARCHAR(100) NOT NULL,
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  nickname VARCHAR(100) NULL,
  position VARCHAR(100) NULL,
  phone VARCHAR(50) NULL,
  photo_url VARCHAR(500) NULL,
  status VARCHAR(50) DEFAULT 'ทำงานอยู่',
  start_date DATE NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(100) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS code VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(100) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(100) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ทำงานอยู่';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS start_date DATE NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS note TEXT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_position ON employees(position);

UPDATE employees
SET
  employee_code = COALESCE(employee_code, code),
  code = COALESCE(code, employee_code),
  created_at = COALESCE(created_at, createdAt),
  updated_at = COALESCE(updated_at, updatedAt)
WHERE employee_code IS NULL OR code IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- employee_positions
CREATE TABLE IF NOT EXISTS employee_positions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employee_positions ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employee_positions ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX idx_employee_positions_name ON employee_positions(name);
CREATE INDEX idx_employee_positions_sort_order ON employee_positions(sort_order);

UPDATE employee_positions
SET
  created_at = COALESCE(created_at, createdAt),
  updated_at = COALESCE(updated_at, updatedAt)
WHERE created_at IS NULL OR updated_at IS NULL;

-- employee_attendance
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
  CONSTRAINT fk_employee_attendance_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS note TEXT NULL;
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX idx_employee_attendance_unique ON employee_attendance (employee_id, work_date);
CREATE INDEX idx_employee_attendance_work_date ON employee_attendance(work_date);
CREATE INDEX idx_employee_attendance_status ON employee_attendance(status);

-- employee_leaves
CREATE TABLE IF NOT EXISTS employee_leaves (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  leave_type VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  total_days DECIMAL(5,2) DEFAULT 0,
  reason TEXT NULL,
  approver VARCHAR(255) NULL,
  CONSTRAINT fk_employee_leaves_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employee_leaves ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'รออนุมัติ';
ALTER TABLE employee_leaves ADD COLUMN IF NOT EXISTS leave_duration_type VARCHAR(50) NOT NULL DEFAULT 'full_day';
ALTER TABLE employee_leaves ADD COLUMN IF NOT EXISTS leave_days DECIMAL(5,2) NOT NULL DEFAULT 1.00;
ALTER TABLE employee_leaves ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employee_leaves ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX idx_employee_leaves_employee_id ON employee_leaves(employee_id);
CREATE INDEX idx_employee_leaves_start_date ON employee_leaves(start_date);
CREATE INDEX idx_employee_leaves_status ON employee_leaves(status);

UPDATE employee_leaves
SET
  leave_duration_type = COALESCE(NULLIF(leave_duration_type, ''), 'full_day'),
  leave_days = COALESCE(NULLIF(leave_days, 0), 1.00)
WHERE leave_duration_type IS NULL OR leave_duration_type = '' OR leave_days IS NULL OR leave_days <= 0;

-- employee_incomes
CREATE TABLE IF NOT EXISTS employee_incomes (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  type VARCHAR(100) NOT NULL,
  work_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  CONSTRAINT fk_employee_incomes_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS custom_type VARCHAR(100) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS detail TEXT NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS note TEXT NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS overtime_start_time TIME NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS overtime_end_time TIME NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(6,2) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS overtime_rate_type VARCHAR(50) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(8,2) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS hourly_wage DECIMAL(10,2) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS overtime_reason TEXT NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS repair_reference VARCHAR(255) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS license_plate VARCHAR(100) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS commission_base DECIMAL(12,2) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(8,2) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS calculation_note TEXT NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS source_type VARCHAR(100) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS source_id VARCHAR(100) NULL;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employee_incomes ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX idx_employee_incomes_employee_id ON employee_incomes(employee_id);
CREATE INDEX idx_employee_incomes_work_date ON employee_incomes(work_date);
CREATE INDEX idx_employee_incomes_type ON employee_incomes(type);
CREATE INDEX idx_employee_incomes_status ON employee_incomes(status);

-- attendance_settings
CREATE TABLE IF NOT EXISTS attendance_settings (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NULL,
  morning_start TIME NULL,
  morning_late_after TIME NULL,
  lunch_out TIME NULL,
  afternoon_start TIME NULL,
  afternoon_late_after TIME NULL,
  work_end TIME NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'api'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX idx_attendance_settings_employee_id ON attendance_settings(employee_id);


-- -------------------------------------------------------------
-- EXPLICIT REFERENCE-DATA SEED
-- -------------------------------------------------------------
INSERT IGNORE INTO employee_positions (id, name, sort_order, active) VALUES
('position-owner', 'เจ้าของอู่', 1, 1),
('position-manager', 'ผู้จัดการ', 2, 1),
('position-accounting', 'พนักงานบัญชี', 3, 1),
('position-stock', 'พนักงานสต๊อก', 4, 1),
('position-mechanic', 'ช่าง', 5, 1);

INSERT IGNORE INTO attendance_settings (
  id, employee_id, morning_start, morning_late_after, lunch_out, afternoon_start, afternoon_late_after, work_end, source
) VALUES (
  'attendance-settings-default', NULL, '09:00:00', '09:06:00', '12:30:00', '13:30:00', '13:31:00', '18:00:00', 'seed'
);
