CREATE TABLE IF NOT EXISTS financial_transactions (
  id VARCHAR(64) PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NULL,
  type ENUM('income','expense') NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_financial_transactions_date (date),
  INDEX idx_financial_transactions_type (type),
  INDEX idx_financial_transactions_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
