import { getDbConfig, query, testConnection } from '../../../lib/db';
import { ensureAdminSessionsTable, ensureAdminUsersTable } from '../../../lib/adminAuth';
import { ensureAuditLogsTable } from '../../../lib/auditLog';
import { ensureEmployeeStorageTables } from '../../../lib/employeeStorage';
import { ensureStockCategoriesTable, ensureStockMovementsTable, ensureStockProductsTable } from '../../../lib/stockStorage';
import { ensurePaymentDebtTables } from '../../../lib/paymentDebtStorage';

async function ensureVehiclesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(64) PRIMARY KEY,
      invoice_number VARCHAR(100) NULL,
      license_plate VARCHAR(100) NULL,
      owner_name VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      brand VARCHAR(100) NULL,
      model VARCHAR(100) NULL,
      car_brand VARCHAR(100) NULL,
      car_model VARCHAR(100) NULL,
      color VARCHAR(100) NULL,
      vin VARCHAR(100) NULL,
      mileage INT NULL,
      status VARCHAR(100) NULL,
      status_detail TEXT NULL,
      repair_cost DECIMAL(12,2) DEFAULT 0,
      booking_date DATE NULL,
      estimated_completion_date DATE NULL,
      entry_date DATE NULL,
      booking_time VARCHAR(50) NULL,
      estimated_completion DATE NULL,
      receipt_image MEDIUMTEXT NULL,
      receipt_images MEDIUMTEXT NULL,
      receipt_name VARCHAR(255) NULL,
      receipt_url TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureFinancialTransactionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id VARCHAR(64) PRIMARY KEY,
      date DATE NULL,
      time TIME NULL,
      transaction_date DATE NOT NULL,
      type VARCHAR(50) NOT NULL,
      category VARCHAR(100) NULL,
      description TEXT NULL,
      amount DECIMAL(12,2) DEFAULT 0,
      payment_method VARCHAR(100) NULL,
      receipt_image_url TEXT NULL,
      related_vehicle_id VARCHAR(64) NULL,
      note TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureVehicleReceiptsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS vehicle_receipts (
      id VARCHAR(64) PRIMARY KEY,
      vehicle_id VARCHAR(64) NOT NULL,
      file_name VARCHAR(255) NULL,
      file_url TEXT NULL,
      mime_type VARCHAR(100) NULL,
      file_size INT NULL,
      uploaded_by VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureSystemSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      setting_type VARCHAR(50) NULL,
      description TEXT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function GET() {
  const tableChecks = {
    admin_users: false,
    admin_sessions: false,
    vehicles: false,
    vehicle_receipts: false,
    financial_transactions: false,
    employees: false,
    employee_positions: false,
    employee_attendance: false,
    employee_leaves: false,
    attendance_settings: false,
    stock_categories: false,
    stock_products: false,
    stock_movements: false,
    payment_debts: false,
    payment_debt_payments: false,
    audit_logs: false,
    system_settings: false,
  };

  let charset = '';
  let status = 200;
  let database = 'disconnected';

  try {
    await ensureAdminUsersTable();
    await ensureAdminSessionsTable();
    await ensureVehiclesTable();
    await ensureVehicleReceiptsTable();
    await ensureFinancialTransactionsTable();
    await ensureEmployeeStorageTables();
    await ensureStockCategoriesTable();
    await ensureStockProductsTable();
    await ensureStockMovementsTable();
    await ensurePaymentDebtTables();
    await ensureAuditLogsTable();
    await ensureSystemSettingsTable();

    await testConnection();
    database = 'connected';

    const rows = await query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.tables
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN ('admin_users', 'admin_sessions', 'vehicles', 'vehicle_receipts', 'financial_transactions', 'employees', 'employee_positions', 'employee_attendance', 'employee_leaves', 'attendance_settings', 'stock_categories', 'stock_products', 'stock_movements', 'payment_debts', 'payment_debt_payments', 'audit_logs', 'system_settings')
    `, [getDbConfig().database]);

    for (const row of rows) {
      tableChecks[row.TABLE_NAME] = true;
      if (!charset && row.TABLE_COLLATION) charset = String(row.TABLE_COLLATION);
    }
  } catch (error) {
    console.error('[health] GET failed', error);
    status = 503;
  }

  const ok = database === 'connected' && Object.values(tableChecks).every(Boolean);
  if (!ok) status = 503;

  return Response.json({
    ok,
    server: 'running',
    database,
    charset: charset || 'unknown',
    utf8mb4: charset.includes('utf8mb4'),
    tables: tableChecks,
  }, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
