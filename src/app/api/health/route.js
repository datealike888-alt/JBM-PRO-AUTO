import { NextResponse } from 'next/server';
import { getDbConfig, query, testConnection } from '../../../lib/db';

function healthJson(data, status) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function classifyHealthError(error) {
  if (error?.code === 'DATABASE_CONFIGURATION_ERROR') {
    return {
      status: 503,
      body: {
        success: false,
        status: 'error',
        database: 'not_configured',
        error: 'ระบบฐานข้อมูลยังไม่พร้อม',
        code: 'DATABASE_CONFIGURATION_ERROR',
      },
    };
  }

  return {
    status: 503,
    body: {
      success: false,
      status: 'error',
      database: 'disconnected',
      error: 'เชื่อมต่อฐานข้อมูลไม่ได้',
      code: 'DATABASE_CONNECTION_ERROR',
    },
  };
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
  try {
    await testConnection();

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
    console.error('[health] GET failed', { code: error?.code || 'DATABASE_CONNECTION_ERROR' });
    const result = classifyHealthError(error);
    return healthJson(result.body, result.status);
  }

  const tablesReady = Object.values(tableChecks).every(Boolean);
  if (!tablesReady) {
    return healthJson({
      success: false,
      status: 'degraded',
      database: 'connected',
      error: 'โครงสร้างฐานข้อมูลยังไม่พร้อม',
      code: 'DATABASE_SCHEMA_NOT_READY',
      tables: tableChecks,
    }, 503);
  }

  return healthJson({
    success: true,
    status: 'ok',
    database: 'connected',
    ok: true,
    server: 'running',
    charset: charset || 'unknown',
    utf8mb4: charset.includes('utf8mb4'),
    tables: tableChecks,
  }, 200);
}
