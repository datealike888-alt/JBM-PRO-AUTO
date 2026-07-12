import { query } from './db';

const schemaCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // Cache valid domains for 60 seconds

// Define the exact required columns for each domain to guarantee API stability
export const DOMAIN_SCHEMA_MAP = {
  vehicles: {
    vehicles: [
      'id', 'invoice_number', 'license_plate', 'owner_name', 'phone',
      'brand', 'model', 'color', 'vin', 'mileage', 'status', 'repair_cost',
      'booking_date', 'booking_time', 'estimated_completion_date',
      'status_detail', 'receipt_image', 'receipt_images', 'created_at', 'updated_at'
    ],
    vehicle_receipts: [
      'id', 'vehicle_id', 'file_name', 'file_url', 'mime_type', 'file_size',
      'uploaded_by', 'created_at'
    ]
  },
  financial: {
    financial_transactions: [
      'id', 'date', 'time', 'transaction_date', 'type', 'category',
      'description', 'amount', 'cost_amount', 'vat_amount', 'before_vat_3_percent',
      'profit_amount', 'payment_method', 'receipt_image_url', 'related_vehicle_id',
      'note', 'created_at', 'updated_at'
    ],
    cash_reserve_transactions: [
      'id', 'transaction_date', 'transaction_time', 'type', 'detail', 'vehicle_ref',
      'case_ref', 'person_name', 'payment_channel', 'amount', 'direction',
      'balance_after', 'receipt_image_url', 'note', 'created_at', 'updated_at'
    ],
    supplier_payables: [
      'id', 'transaction_date', 'company_name', 'outstanding_amount', 'status',
      'paid_date', 'slip_url', 'note', 'created_by', 'created_at', 'updated_at'
    ],
    payment_debts: [
      'id', 'customer_name', 'phone', 'case_reference', 'total_amount',
      'paid_amount', 'balance_amount', 'status', 'due_date', 'payment_method',
      'description', 'note', 'receipt_image_url', 'receipt_images', 'created_at', 'updated_at'
    ],
    payment_debt_payments: [
      'id', 'debt_id', 'payment_date', 'payment_time', 'amount', 'payment_method',
      'note', 'receipt_image_url', 'receipt_images', 'created_at'
    ]
  },
  employees: {
    employees: [
      'id', 'employee_code', 'code', 'name', 'role', 'active', 'first_name',
      'last_name', 'nickname', 'position', 'phone', 'photo_url', 'status',
      'start_date', 'note', 'createdAt', 'updatedAt', 'created_at', 'updated_at'
    ],
    employee_positions: [
      'id', 'name', 'sort_order', 'active', 'created_at', 'updated_at'
    ],
    employee_attendance: [
      'id', 'employee_id', 'work_date', 'check_in_time', 'lunch_out_time',
      'lunch_in_time', 'check_out_time', 'status', 'total_hours', 'ot_hours',
      'note', 'created_at', 'updated_at'
    ],
    employee_leaves: [
      'id', 'employee_id', 'leave_type', 'start_date', 'end_date', 'total_days',
      'leave_duration_type', 'leave_days', 'reason', 'approver', 'status',
      'created_at', 'updated_at'
    ],
    employee_incomes: [
      'id', 'employee_id', 'type', 'custom_type', 'work_date', 'title', 'detail',
      'note', 'amount', 'status', 'overtime_start_time', 'overtime_end_time',
      'overtime_hours', 'overtime_rate_type', 'overtime_rate', 'hourly_wage',
      'overtime_reason', 'repair_reference', 'license_plate', 'customer_name',
      'commission_base', 'commission_percent', 'calculation_note', 'source_type',
      'source_id', 'created_at', 'updated_at'
    ],
    attendance_settings: [
      'id', 'employee_id', 'morning_start', 'morning_late_after', 'lunch_out',
      'afternoon_start', 'afternoon_late_after', 'work_end', 'source',
      'created_at', 'updated_at'
    ]
  },
  audit: {
    audit_logs: [
      'id', 'action', 'module', 'entity_type', 'entity_id', 'detail', 'created_by', 'created_at'
    ]
  }
};

/**
 * Checks if a specific table has all required columns.
 * Uses INFORMATION_SCHEMA for a read-only, non-mutating check.
 */
async function checkTableColumns(tableName, requiredColumns) {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  if (!rows || rows.length === 0) {
    return { ready: false, missingTable: true, missingColumns: requiredColumns };
  }

  const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));
  const missing = requiredColumns.filter((col) => !existingColumns.has(col));

  return {
    ready: missing.length === 0,
    missingTable: false,
    missingColumns: missing
  };
}

/**
 * Verifies if the database schema for a specific domain is fully ready.
 * Throws a specific Error if not, which can be caught to return a 503.
 * Returns true if ready.
 */
export async function assertSchemaReady(domain) {
  const schemaMap = DOMAIN_SCHEMA_MAP[domain];
  if (!schemaMap) {
    throw new Error(`Unknown schema domain: ${domain}`);
  }

  // Check cache
  const cached = schemaCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (cached.ready) return true;
  }

  const missingReport = {};
  let isReady = true;

  for (const [tableName, requiredColumns] of Object.entries(schemaMap)) {
    const result = await checkTableColumns(tableName, requiredColumns);
    if (!result.ready) {
      isReady = false;
      missingReport[tableName] = result.missingTable
        ? ['TABLE_MISSING', ...result.missingColumns]
        : result.missingColumns;
    }
  }

  if (isReady) {
    schemaCache.set(domain, { ready: true, timestamp: Date.now() });
    return true;
  }

  // Do not cache failures permanently so it can recover after migration runs
  // Throw an error with safe details (no SQL/secrets exposed)
  const error = new Error(`Schema for domain '${domain}' is not ready.`);
  error.code = 'SCHEMA_NOT_READY';
  error.domain = domain;
  error.missing = missingReport;
  throw error;
}

export function resetSchemaReadinessCache(domain) {
  if (domain) {
    schemaCache.delete(domain);
    return;
  }
  schemaCache.clear();
}

export function handleSchemaError(error) {
  if (error && error.code === 'SCHEMA_NOT_READY') {
    return new Response(
      JSON.stringify({
        error: 'ระบบอยู่ระหว่างการปรับปรุงฐานข้อมูล (Schema Not Ready)',
        databaseConnected: true,
        schemaReady: false,
        domain: error.domain,
        missing: error.missing
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  return null;
}
