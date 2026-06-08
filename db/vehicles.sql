CREATE DATABASE IF NOT EXISTS lms_enterprise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lms_enterprise;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  receiptNo VARCHAR(50),
  ownerName VARCHAR(255),
  phone VARCHAR(50),
  plateNo VARCHAR(50),
  brand VARCHAR(100),
  model VARCHAR(255),
  color VARCHAR(100),
  status INT,
  statusText TEXT,
  entryDate DATE,
  bookingTime VARCHAR(20),
  estimatedCompletion DATE,
  cost INT,
  vin VARCHAR(100),
  receiptName VARCHAR(255),
  receiptUrl MEDIUMTEXT,
  logs JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
