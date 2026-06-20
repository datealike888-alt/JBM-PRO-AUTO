SET @has_photo_url := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'photo_url'
);

SET @employee_photo_sql := IF(
  @has_photo_url = 0,
  'ALTER TABLE employees ADD COLUMN photo_url VARCHAR(500) NULL',
  'SELECT 1'
);

PREPARE employee_photo_stmt FROM @employee_photo_sql;
EXECUTE employee_photo_stmt;
DEALLOCATE PREPARE employee_photo_stmt;
