-- Align attendance/leave runtime schema with canonical tables.
-- Safe for existing databases: creates missing canonical tables and copies legacy rows only when legacy tables exist.
-- This migration does not DROP, TRUNCATE, DELETE, or RENAME any table.

SET NAMES utf8mb4;

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
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_employee_attendance_unique (employee_id, work_date),
  INDEX idx_employee_attendance_work_date (work_date),
  INDEX idx_employee_attendance_status (status),
  CONSTRAINT fk_employee_attendance_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_leaves (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  leave_type VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  total_days DECIMAL(5,2) DEFAULT 0,
  leave_duration_type VARCHAR(50) NOT NULL DEFAULT 'full_day',
  leave_days DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  reason TEXT NULL,
  approver VARCHAR(255) NULL,
  status VARCHAR(50) DEFAULT 'รออนุมัติ',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_leaves_employee_id (employee_id),
  INDEX idx_employee_leaves_start_date (start_date),
  INDEX idx_employee_leaves_status (status),
  CONSTRAINT fk_employee_leaves_employee_id
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_legacy_attendance_logs = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance_logs'
);

SET @copy_legacy_attendance_sql = IF(
  @has_legacy_attendance_logs > 0,
  'INSERT INTO employee_attendance (
     id, employee_id, work_date, check_in_time, lunch_out_time, lunch_in_time, check_out_time,
     status, total_hours, ot_hours, note, created_at, updated_at
   )
   SELECT
     id, employee_id, date, morning_in, lunch_out, afternoon_in, evening_out,
     status, COALESCE(hours, 0), 0, NULL, COALESCE(createdAt, CURRENT_TIMESTAMP), COALESCE(updatedAt, CURRENT_TIMESTAMP)
   FROM attendance_logs
   ON DUPLICATE KEY UPDATE
     id = id',
  'SELECT 1'
);
PREPARE copy_legacy_attendance_stmt FROM @copy_legacy_attendance_sql;
EXECUTE copy_legacy_attendance_stmt;
DEALLOCATE PREPARE copy_legacy_attendance_stmt;

SET @has_legacy_leave_logs = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leave_logs'
);

SET @copy_legacy_leave_sql = IF(
  @has_legacy_leave_logs > 0,
  'INSERT INTO employee_leaves (
     id, employee_id, leave_type, start_date, end_date, total_days,
     leave_duration_type, leave_days, reason, approver, status, created_at, updated_at
   )
   SELECT
     id, employee_id, type, start_date, end_date, COALESCE(total_days, 0),
     ''full_day'', COALESCE(NULLIF(total_days, 0), 1.00), reason, approver, ''รออนุมัติ'',
     COALESCE(submitted_at, createdAt, CURRENT_TIMESTAMP), COALESCE(updatedAt, CURRENT_TIMESTAMP)
   FROM leave_logs
   ON DUPLICATE KEY UPDATE
     id = id',
  'SELECT 1'
);
PREPARE copy_legacy_leave_stmt FROM @copy_legacy_leave_sql;
EXECUTE copy_legacy_leave_stmt;
DEALLOCATE PREPARE copy_legacy_leave_stmt;

-- Rollback guidance: keep this migration file as documentation. To revert application use, point routes back
-- to the legacy tables in source after verifying copied data. Do not drop either canonical or legacy table
-- until a separate backup and validation process is complete.
