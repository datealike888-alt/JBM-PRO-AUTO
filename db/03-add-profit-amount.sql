-- Migration: Add profit_amount to financial_transactions
-- This script is idempotent and can be run safely even if the column already exists.

SET NAMES utf8mb4;

-- Use a safe routine to add the column if it doesn't exist
DELIMITER //
CREATE PROCEDURE add_profit_amount_column()
BEGIN
    DECLARE column_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'financial_transactions'
      AND column_name = 'profit_amount';

    IF column_exists = 0 THEN
        ALTER TABLE financial_transactions
        ADD COLUMN profit_amount DECIMAL(15,2) NULL DEFAULT NULL;
    END IF;
END //
DELIMITER ;

CALL add_profit_amount_column();
DROP PROCEDURE IF EXISTS add_profit_amount_column;
