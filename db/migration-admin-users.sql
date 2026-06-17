DROP TABLE IF EXISTS admin_users;

CREATE TABLE admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active TINYINT(1) DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
-- Username: admin
-- Password: ChangeMe123!
INSERT INTO admin_users (username, password_hash, full_name, role, is_active)
VALUES (
  'admin',
  '$2b$10$Gm/qbmmeTtZvgnYLBchSHerur2GJhKSRXUZY8xSNwI2pDFUkS7ikW',
  'JBM Admin',
  'admin',
  1
);
