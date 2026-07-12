-- Migration: 20260712-audit-schema
-- Description: Consolidates runtime DDL for audit_logs

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(64) NULL,
  detail TEXT NULL,
  created_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_created_at (created_at),
  INDEX idx_audit_logs_module (module),
  INDEX idx_audit_logs_entity_id (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
