SET @add_before_vat_3_percent := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'financial_transactions'
      AND COLUMN_NAME = 'before_vat_3_percent'
  ) = 0,
  'ALTER TABLE financial_transactions ADD COLUMN before_vat_3_percent DECIMAL(12,2) NULL DEFAULT 0',
  'SELECT ''before_vat_3_percent already exists'' AS message'
);

PREPARE stmt FROM @add_before_vat_3_percent;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
