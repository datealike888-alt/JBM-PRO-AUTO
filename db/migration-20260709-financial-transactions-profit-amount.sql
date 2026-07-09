SET @add_profit_amount := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'financial_transactions'
      AND COLUMN_NAME = 'profit_amount'
  ) = 0,
  'ALTER TABLE financial_transactions ADD COLUMN profit_amount DECIMAL(12,2) NULL DEFAULT NULL',
  'SELECT ''profit_amount already exists'' AS message'
);

PREPARE stmt FROM @add_profit_amount;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
