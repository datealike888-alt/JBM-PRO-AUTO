-- Migration: 20260712-financial-schema
-- Description: Canonical financial schema used by the runtime API/storage code.
-- Safe to re-run against an existing database and preserves existing rows.

DROP PROCEDURE IF EXISTS jbm_add_column_if_missing;
DROP PROCEDURE IF EXISTS jbm_create_index_if_missing;

DELIMITER $$

CREATE PROCEDURE jbm_add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @jbm_sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_definition);
    PREPARE jbm_stmt FROM @jbm_sql;
    EXECUTE jbm_stmt;
    DEALLOCATE PREPARE jbm_stmt;
  END IF;
END$$

CREATE PROCEDURE jbm_create_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @jbm_sql = CONCAT('CREATE INDEX `', p_index_name, '` ON `', p_table_name, '` ', p_index_definition);
    PREPARE jbm_stmt FROM @jbm_sql;
    EXECUTE jbm_stmt;
    DEALLOCATE PREPARE jbm_stmt;
  END IF;
END$$

DELIMITER ;

CREATE TABLE IF NOT EXISTS financial_transactions (
  id VARCHAR(64) PRIMARY KEY,
  date DATE NULL,
  time TIME NULL,
  transaction_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  cost_amount DECIMAL(12,2) NULL DEFAULT NULL,
  vat_amount DECIMAL(12,2) NULL DEFAULT NULL,
  before_vat_3_percent DECIMAL(12,2) NULL DEFAULT 0,
  profit_amount DECIMAL(12,2) NULL DEFAULT NULL,
  payment_method VARCHAR(100) NULL,
  receipt_image_url TEXT NULL,
  related_vehicle_id VARCHAR(64) NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL jbm_add_column_if_missing('financial_transactions', 'date', '`date` DATE NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'time', '`time` TIME NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'transaction_date', '`transaction_date` DATE NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'type', '`type` VARCHAR(50) NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'category', '`category` VARCHAR(100) NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'description', '`description` TEXT NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'amount', '`amount` DECIMAL(12,2) DEFAULT 0');
CALL jbm_add_column_if_missing('financial_transactions', 'cost_amount', '`cost_amount` DECIMAL(12,2) NULL DEFAULT NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'vat_amount', '`vat_amount` DECIMAL(12,2) NULL DEFAULT NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'before_vat_3_percent', '`before_vat_3_percent` DECIMAL(12,2) NULL DEFAULT 0');
CALL jbm_add_column_if_missing('financial_transactions', 'profit_amount', '`profit_amount` DECIMAL(12,2) NULL DEFAULT NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'payment_method', '`payment_method` VARCHAR(100) NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'receipt_image_url', '`receipt_image_url` TEXT NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'related_vehicle_id', '`related_vehicle_id` VARCHAR(64) NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'note', '`note` TEXT NULL');
CALL jbm_add_column_if_missing('financial_transactions', 'created_at', '`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL jbm_add_column_if_missing('financial_transactions', 'updated_at', '`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

UPDATE financial_transactions
SET transaction_date = COALESCE(transaction_date, date)
WHERE transaction_date IS NULL
  AND date IS NOT NULL;

CALL jbm_create_index_if_missing('financial_transactions', 'idx_financial_transactions_transaction_date', '(`transaction_date`)');
CALL jbm_create_index_if_missing('financial_transactions', 'idx_financial_transactions_date', '(`transaction_date`)');
CALL jbm_create_index_if_missing('financial_transactions', 'idx_financial_transactions_type', '(`type`)');
CALL jbm_create_index_if_missing('financial_transactions', 'idx_financial_transactions_category', '(`category`)');
CALL jbm_create_index_if_missing('financial_transactions', 'idx_financial_transactions_payment_method', '(`payment_method`)');
CALL jbm_create_index_if_missing('financial_transactions', 'idx_financial_transactions_related_vehicle_id', '(`related_vehicle_id`)');

CREATE TABLE IF NOT EXISTS cash_reserve_transactions (
  id VARCHAR(64) PRIMARY KEY,
  transaction_date DATE NOT NULL,
  transaction_time TIME NULL,
  type VARCHAR(50) NOT NULL,
  detail TEXT NOT NULL,
  vehicle_ref VARCHAR(255) NULL,
  case_ref VARCHAR(255) NULL,
  person_name VARCHAR(255) NULL,
  payment_channel VARCHAR(100) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  direction VARCHAR(20) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  receipt_image_url TEXT NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL jbm_add_column_if_missing('cash_reserve_transactions', 'transaction_date', '`transaction_date` DATE NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'transaction_time', '`transaction_time` TIME NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'type', '`type` VARCHAR(50) NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'detail', '`detail` TEXT NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'vehicle_ref', '`vehicle_ref` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'case_ref', '`case_ref` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'person_name', '`person_name` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'payment_channel', '`payment_channel` VARCHAR(100) NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'amount', '`amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'direction', '`direction` VARCHAR(20) NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'balance_after', '`balance_after` DECIMAL(12,2) NOT NULL DEFAULT 0.00');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'receipt_image_url', '`receipt_image_url` TEXT NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'note', '`note` TEXT NULL');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'created_at', '`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL jbm_add_column_if_missing('cash_reserve_transactions', 'updated_at', '`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL jbm_create_index_if_missing('cash_reserve_transactions', 'idx_cash_reserve_transactions_transaction_date', '(`transaction_date`)');
CALL jbm_create_index_if_missing('cash_reserve_transactions', 'idx_cash_reserve_transactions_type', '(`type`)');

CREATE TABLE IF NOT EXISTS supplier_payables (
  id VARCHAR(64) PRIMARY KEY,
  transaction_date DATE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'รอจ่าย',
  paid_date DATE NULL,
  slip_url TEXT NULL,
  note TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL jbm_add_column_if_missing('supplier_payables', 'transaction_date', '`transaction_date` DATE NULL');
CALL jbm_add_column_if_missing('supplier_payables', 'company_name', '`company_name` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('supplier_payables', 'outstanding_amount', '`outstanding_amount` DECIMAL(12,2) NOT NULL DEFAULT 0');
CALL jbm_add_column_if_missing('supplier_payables', 'status', '`status` VARCHAR(32) NOT NULL DEFAULT ''รอจ่าย''');
CALL jbm_add_column_if_missing('supplier_payables', 'paid_date', '`paid_date` DATE NULL');
CALL jbm_add_column_if_missing('supplier_payables', 'slip_url', '`slip_url` TEXT NULL');
CALL jbm_add_column_if_missing('supplier_payables', 'note', '`note` TEXT NULL');
CALL jbm_add_column_if_missing('supplier_payables', 'created_by', '`created_by` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('supplier_payables', 'created_at', '`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL jbm_add_column_if_missing('supplier_payables', 'updated_at', '`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL jbm_create_index_if_missing('supplier_payables', 'idx_supplier_payables_status', '(`status`)');
CALL jbm_create_index_if_missing('supplier_payables', 'idx_supplier_payables_company_name', '(`company_name`)');
CALL jbm_create_index_if_missing('supplier_payables', 'idx_supplier_payables_transaction_date', '(`transaction_date`)');
CALL jbm_create_index_if_missing('supplier_payables', 'idx_supplier_payables_updated_at', '(`updated_at`)');

CREATE TABLE IF NOT EXISTS payment_debts (
  id VARCHAR(64) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  case_reference VARCHAR(255) NULL,
  total_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(64) NULL,
  due_date DATE NULL,
  payment_method VARCHAR(100) NULL,
  description TEXT NULL,
  note TEXT NULL,
  receipt_image_url TEXT NULL,
  receipt_images TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL jbm_add_column_if_missing('payment_debts', 'customer_name', '`customer_name` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('payment_debts', 'phone', '`phone` VARCHAR(64) NULL');
CALL jbm_add_column_if_missing('payment_debts', 'case_reference', '`case_reference` VARCHAR(255) NULL');
CALL jbm_add_column_if_missing('payment_debts', 'total_amount', '`total_amount` DECIMAL(12,2) DEFAULT 0');
CALL jbm_add_column_if_missing('payment_debts', 'paid_amount', '`paid_amount` DECIMAL(12,2) DEFAULT 0');
CALL jbm_add_column_if_missing('payment_debts', 'balance_amount', '`balance_amount` DECIMAL(12,2) DEFAULT 0');
CALL jbm_add_column_if_missing('payment_debts', 'status', '`status` VARCHAR(64) NULL');
CALL jbm_add_column_if_missing('payment_debts', 'due_date', '`due_date` DATE NULL');
CALL jbm_add_column_if_missing('payment_debts', 'payment_method', '`payment_method` VARCHAR(100) NULL');
CALL jbm_add_column_if_missing('payment_debts', 'description', '`description` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debts', 'note', '`note` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debts', 'receipt_image_url', '`receipt_image_url` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debts', 'receipt_images', '`receipt_images` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debts', 'created_at', '`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL jbm_add_column_if_missing('payment_debts', 'updated_at', '`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL jbm_create_index_if_missing('payment_debts', 'idx_payment_debts_status', '(`status`)');
CALL jbm_create_index_if_missing('payment_debts', 'idx_payment_debts_due_date', '(`due_date`)');
CALL jbm_create_index_if_missing('payment_debts', 'idx_payment_debts_customer_name', '(`customer_name`)');

CREATE TABLE IF NOT EXISTS payment_debt_payments (
  id VARCHAR(64) PRIMARY KEY,
  debt_id VARCHAR(64) NOT NULL,
  payment_date DATE NOT NULL,
  payment_time TIME NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(100) NULL,
  note TEXT NULL,
  receipt_image_url TEXT NULL,
  receipt_images TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL jbm_add_column_if_missing('payment_debt_payments', 'debt_id', '`debt_id` VARCHAR(64) NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'payment_date', '`payment_date` DATE NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'payment_time', '`payment_time` TIME NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'amount', '`amount` DECIMAL(12,2) DEFAULT 0');
CALL jbm_add_column_if_missing('payment_debt_payments', 'payment_method', '`payment_method` VARCHAR(100) NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'note', '`note` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'receipt_image_url', '`receipt_image_url` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'receipt_images', '`receipt_images` TEXT NULL');
CALL jbm_add_column_if_missing('payment_debt_payments', 'created_at', '`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL jbm_create_index_if_missing('payment_debt_payments', 'idx_payment_debt_payments_debt_id', '(`debt_id`)');
CALL jbm_create_index_if_missing('payment_debt_payments', 'idx_payment_debt_payments_date', '(`payment_date`)');

SET @jbm_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_debt_payments'
    AND CONSTRAINT_NAME = 'fk_payment_debt_payments_debt_id'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @jbm_orphan_payment_count = (
  SELECT COUNT(*)
  FROM payment_debt_payments p
  LEFT JOIN payment_debts d ON d.id = p.debt_id
  WHERE p.debt_id IS NOT NULL
    AND d.id IS NULL
);

SET @jbm_sql = IF(
  @jbm_fk_exists = 0 AND @jbm_orphan_payment_count = 0,
  'ALTER TABLE payment_debt_payments ADD CONSTRAINT fk_payment_debt_payments_debt_id FOREIGN KEY (debt_id) REFERENCES payment_debts(id) ON UPDATE CASCADE',
  'SELECT 1'
);

SET @jbm_sql = IF(
  @jbm_fk_exists = 0 AND @jbm_orphan_payment_count > 0,
  'SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''Cannot add fk_payment_debt_payments_debt_id: orphan payment_debt_payments rows exist''',
  @jbm_sql
);

PREPARE jbm_stmt FROM @jbm_sql;
EXECUTE jbm_stmt;
DEALLOCATE PREPARE jbm_stmt;

SET @jbm_vehicle_table_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles'
);

SET @jbm_financial_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'financial_transactions'
    AND CONSTRAINT_NAME = 'fk_financial_transactions_related_vehicle_id'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @jbm_orphan_financial_count = (
  SELECT COUNT(*)
  FROM financial_transactions f
  LEFT JOIN vehicles v ON v.id = f.related_vehicle_id
  WHERE f.related_vehicle_id IS NOT NULL
    AND v.id IS NULL
);

SET @jbm_sql = IF(
  @jbm_vehicle_table_exists > 0 AND @jbm_financial_fk_exists = 0 AND @jbm_orphan_financial_count = 0,
  'ALTER TABLE financial_transactions ADD CONSTRAINT fk_financial_transactions_related_vehicle_id FOREIGN KEY (related_vehicle_id) REFERENCES vehicles(id) ON UPDATE CASCADE',
  'SELECT 1'
);

SET @jbm_sql = IF(
  @jbm_vehicle_table_exists > 0 AND @jbm_financial_fk_exists = 0 AND @jbm_orphan_financial_count > 0,
  'SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''Cannot add fk_financial_transactions_related_vehicle_id: orphan related_vehicle_id rows exist''',
  @jbm_sql
);

PREPARE jbm_stmt FROM @jbm_sql;
EXECUTE jbm_stmt;
DEALLOCATE PREPARE jbm_stmt;

DROP PROCEDURE IF EXISTS jbm_add_column_if_missing;
DROP PROCEDURE IF EXISTS jbm_create_index_if_missing;
