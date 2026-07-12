import { assertSchemaReady, handleSchemaError } from '../../../../../lib/schemaReadiness';
import { withTransaction } from '../../../../../lib/db';
import { insertAuditLogSafe } from '../../../../../lib/auditLog';
import { requirePermission } from '../../../../../lib/adminPermissions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function deletedCount(result) {
  return Number(result?.affectedRows || 0);
}

export async function DELETE(request) {
  try {
    const authResult = await requirePermission(request, 'employees.delete');
    if (authResult.error) return json({ error: authResult.error }, { status: authResult.status });

    await assertSchemaReady('employees');

    const deleted = await withTransaction(async (conn) => {
      const employeeIncomesResult = await conn.query('DELETE FROM employee_incomes');
      const employeeLeavesResult = await conn.query('DELETE FROM employee_leaves');
      const employeeAttendanceResult = await conn.query('DELETE FROM employee_attendance');

      return {
        employee_attendance: deletedCount(employeeAttendanceResult),
        employee_leaves: deletedCount(employeeLeavesResult),
        employee_incomes: deletedCount(employeeIncomesResult),
      };
    });

    const admin = authResult.admin;
    await insertAuditLogSafe({
      action: 'DELETE',
      module: 'EMPLOYEE_STATS',
      entityType: 'EMPLOYEE_STATS_HISTORY',
      entityId: 'employee-stats-history',
      createdBy: admin.displayName || admin.username,
      detail: {
        targetLabel: 'Clear employee stats history',
        deleted,
        preservedTables: [
          'employees',
          'employee_positions',
          'admin_users',
          'admin_sessions',
          'vehicles',
          'stock_categories',
          'stock_products',
          'stock_movements',
          'financial_transactions',
        ],
      },
    });

    return json({ ok: true, success: true, deleted }, { status: 200 });
  } catch (error) {
    const schemaErrorResponse = handleSchemaError(error);
    if (schemaErrorResponse) return schemaErrorResponse;
    console.error('[employees/stats/clear-history] DELETE failed', error);
    return json({ error: 'Unable to clear employee stats history' }, { status: 503 });
  }
}
