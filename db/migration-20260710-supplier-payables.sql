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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_payables_status (status),
  INDEX idx_supplier_payables_company_name (company_name),
  INDEX idx_supplier_payables_transaction_date (transaction_date),
  INDEX idx_supplier_payables_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
