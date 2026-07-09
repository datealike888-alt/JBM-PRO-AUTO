SET @add_cost_amount := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'financial_transactions'
      AND COLUMN_NAME = 'cost_amount'
  ) = 0,
  'ALTER TABLE financial_transactions ADD COLUMN cost_amount DECIMAL(12,2) NULL DEFAULT NULL',
  'SELECT ''cost_amount already exists'' AS message'
);

PREPARE stmt FROM @add_cost_amount;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_vat_amount := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'financial_transactions'
      AND COLUMN_NAME = 'vat_amount'
  ) = 0,
  'ALTER TABLE financial_transactions ADD COLUMN vat_amount DECIMAL(12,2) NULL DEFAULT NULL',
  'SELECT ''vat_amount already exists'' AS message'
);

PREPARE stmt FROM @add_vat_amount;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;