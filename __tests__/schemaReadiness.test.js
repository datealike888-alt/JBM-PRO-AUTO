beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockImplementation(() => 1000000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const OriginalResponse = global.Response;

beforeAll(() => {
  if (typeof global.Response === 'undefined') {
    global.Response = class TestResponse {
      constructor(body, init = {}) {
        this.body = body;
        this.status = init.status ?? 200;
        this.headers = init.headers ?? {};
      }

      async text() {
        return String(this.body ?? '');
      }

      async json() {
        return JSON.parse(await this.text());
      }
    };
  }
});

afterAll(() => {
  if (OriginalResponse === undefined) {
    delete global.Response;
  } else {
    global.Response = OriginalResponse;
  }
});

const mockAuditColumns = [
  { COLUMN_NAME: 'id' },
  { COLUMN_NAME: 'action' },
  { COLUMN_NAME: 'module' },
  { COLUMN_NAME: 'entity_type' },
  { COLUMN_NAME: 'entity_id' },
  { COLUMN_NAME: 'detail' },
  { COLUMN_NAME: 'created_by' },
  { COLUMN_NAME: 'created_at' },
];

const financialColumnsByTable = {
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
  ],
};

function mockFinancialQuery({ missingTable, missingColumn } = {}) {
  return jest.fn().mockImplementation((sql, [tableName]) => {
    if (missingTable === tableName) return Promise.resolve([]);
    const columns = [...financialColumnsByTable[tableName]];
    if (missingColumn?.table === tableName) {
      return Promise.resolve(columns.filter((column) => column !== missingColumn.column).map((COLUMN_NAME) => ({ COLUMN_NAME })));
    }
    return Promise.resolve(columns.map((COLUMN_NAME) => ({ COLUMN_NAME })));
  });
}

describe('schemaReadiness', () => {
  it('1. Domain พร้อม (Domain is ready)', async () => {
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockResolvedValue(mockAuditColumns)
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');
    const { query } = require('../src/lib/db');

    const isReady = await assertSchemaReady('audit');
    expect(isReady).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('information_schema.COLUMNS'),
      ['audit_logs']
    );
  });

  it('2. Missing table (Table does not exist)', async () => {
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockResolvedValue([])
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('audit')).rejects.toMatchObject({
      code: 'SCHEMA_NOT_READY',
      domain: 'audit',
      missing: { audit_logs: expect.arrayContaining(['TABLE_MISSING']) }
    });
  });

  it('3. Missing column (Table exists but lacks required columns)', async () => {
    const incompleteColumns = mockAuditColumns.filter((col) => col.COLUMN_NAME !== 'detail');
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockResolvedValue(incompleteColumns)
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('audit')).rejects.toMatchObject({
      code: 'SCHEMA_NOT_READY',
      domain: 'audit',
      missing: { audit_logs: expect.arrayContaining(['detail']) }
    });
  });

  it('4. Database query error (Throws error normally to trigger 503)', async () => {
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockRejectedValue(new Error('Connection lost'))
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('audit')).rejects.toThrow('Connection lost');
  });

  it('5. Production response ไม่เปิดเผยชื่อ SQL/Credential', async () => {
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockResolvedValue([])
    }));
    const { assertSchemaReady, handleSchemaError } = require('../src/lib/schemaReadiness');

    try {
      await assertSchemaReady('audit');
    } catch (error) {
      const response = handleSchemaError(error);
      expect(response).not.toBeNull();
      expect(response.status).toBe(503);

      // Simulate Response.json() if it's a native Response object or just check the text
      // However, we might not have native Response in jest without jsdom or undici.
      // Assuming Next.js polyfills Response.
      const body = await response.json();
      expect(body.error).toBe('ระบบอยู่ระหว่างการปรับปรุงฐานข้อมูล (Schema Not Ready)');
      expect(body.schemaReady).toBe(false);
      expect(body.domain).toBe('audit');

      const responseText = JSON.stringify(body);
      expect(responseText).not.toContain('information_schema');
      expect(responseText).not.toContain('CREATE TABLE');
      expect(responseText).not.toContain('root');
      expect(responseText).not.toContain('password');
    }
  });

  it('6. Ready cache ใช้งานได้ (Uses cache and avoids query)', async () => {
    const queryMock = jest.fn().mockResolvedValue(mockAuditColumns);
    jest.doMock('../src/lib/db', () => ({
      query: queryMock
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    // First call (cache miss)
    await assertSchemaReady('audit');
    expect(queryMock).toHaveBeenCalledTimes(1);

    // Second call within TTL (cache hit)
    jest.spyOn(Date, 'now').mockImplementation(() => 1000000 + 10000); // 10 seconds later
    await assertSchemaReady('audit');
    expect(queryMock).toHaveBeenCalledTimes(1); // Still 1

    // Third call after TTL (cache expired)
    jest.spyOn(Date, 'now').mockImplementation(() => 1000000 + 70000); // 70 seconds later
    await assertSchemaReady('audit');
    expect(queryMock).toHaveBeenCalledTimes(2); // Queried again
  });

  it('7. Missing schema ไม่ถูก cache ถาวร', async () => {
    let mockResult = [];
    const queryMock = jest.fn().mockImplementation(() => Promise.resolve(mockResult));
    jest.doMock('../src/lib/db', () => ({
      query: queryMock
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    // Attempt 1 fails
    await expect(assertSchemaReady('audit')).rejects.toThrow();
    expect(queryMock).toHaveBeenCalledTimes(1);

    // Change mock to success
    mockResult = mockAuditColumns;

    // Attempt 2 immediately after should query again, not hit a failed cache
    const isReady = await assertSchemaReady('audit');
    expect(isReady).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('8. Employee domain schema readiness requires specific tables', async () => {
    // This test ensures the schema map for employee domain is checked.
    // Required tables: employees, employee_positions, employee_attendance, employee_leaves, employee_incomes, attendance_settings
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockResolvedValue([])
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('employees')).rejects.toMatchObject({
      code: 'SCHEMA_NOT_READY',
      domain: 'employees',
      missing: {
        employees: expect.any(Array),
        employee_positions: expect.any(Array),
        employee_attendance: expect.any(Array),
        employee_leaves: expect.any(Array),
        employee_incomes: expect.any(Array),
        attendance_settings: expect.any(Array),
      }
    });
  });

  it('9. Financial domain schema ครบ ต้องผ่าน', async () => {
    const queryMock = mockFinancialQuery();
    jest.doMock('../src/lib/db', () => ({ query: queryMock }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('financial')).resolves.toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(5);
  });

  it.each([
    'financial_transactions',
    'cash_reserve_transactions',
    'payment_debts',
    'payment_debt_payments',
    'supplier_payables',
  ])('10. Financial domain ขาด table %s ต้อง SCHEMA_NOT_READY', async (tableName) => {
    const queryMock = mockFinancialQuery({ missingTable: tableName });
    jest.doMock('../src/lib/db', () => ({ query: queryMock }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('financial')).rejects.toMatchObject({
      code: 'SCHEMA_NOT_READY',
      domain: 'financial',
      missing: {
        [tableName]: expect.arrayContaining(['TABLE_MISSING']),
      },
    });
  });

  it('11. Financial domain ขาด column ต้องระบุ table/column ถูกต้อง', async () => {
    const queryMock = mockFinancialQuery({
      missingColumn: { table: 'payment_debts', column: 'balance_amount' },
    });
    jest.doMock('../src/lib/db', () => ({ query: queryMock }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('financial')).rejects.toMatchObject({
      code: 'SCHEMA_NOT_READY',
      domain: 'financial',
      missing: {
        payment_debts: expect.arrayContaining(['balance_amount']),
      },
    });
  });

  it('12. Database query error ของ financial ต้องโยน Error เดิม', async () => {
    jest.doMock('../src/lib/db', () => ({
      query: jest.fn().mockRejectedValue(new Error('Connection lost'))
    }));
    const { assertSchemaReady } = require('../src/lib/schemaReadiness');

    await expect(assertSchemaReady('financial')).rejects.toThrow('Connection lost');
  });

  it('13. Reset cache ใช้งานได้', async () => {
    const queryMock = mockFinancialQuery();
    jest.doMock('../src/lib/db', () => ({ query: queryMock }));
    const { assertSchemaReady, resetSchemaReadinessCache } = require('../src/lib/schemaReadiness');

    await assertSchemaReady('financial');
    await assertSchemaReady('financial');
    expect(queryMock).toHaveBeenCalledTimes(5);

    resetSchemaReadinessCache('financial');
    await assertSchemaReady('financial');
    expect(queryMock).toHaveBeenCalledTimes(10);
  });

  it('14. Production response ของ financial ไม่เปิดเผย SQL/Credential', async () => {
    const queryMock = mockFinancialQuery({ missingTable: 'payment_debts' });
    jest.doMock('../src/lib/db', () => ({ query: queryMock }));
    const { assertSchemaReady, handleSchemaError } = require('../src/lib/schemaReadiness');

    try {
      await assertSchemaReady('financial');
      throw new Error('Expected financial schema readiness to fail');
    } catch (error) {
      const response = handleSchemaError(error);
      expect(response).not.toBeNull();
      expect(response.status).toBe(503);
      const body = await response.json();
      const responseText = JSON.stringify(body);
      expect(body.domain).toBe('financial');
      expect(responseText).not.toContain('information_schema');
      expect(responseText).not.toContain('CREATE TABLE');
      expect(responseText).not.toContain('root');
      expect(responseText).not.toContain('password');
    }
  });

  it('15. Domain financial ต้องตรงกับ canonical migration', async () => {
    jest.doMock('../src/lib/db', () => ({ query: jest.fn() }));
    const fs = require('fs');
    const path = require('path');
    const { DOMAIN_SCHEMA_MAP } = require('../src/lib/schemaReadiness');
    const migration = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migration-20260712-financial-schema.sql'),
      'utf8'
    );

    for (const [tableName, columns] of Object.entries(DOMAIN_SCHEMA_MAP.financial)) {
      expect(migration).toContain(tableName);
      for (const column of columns) {
        expect(migration).toMatch(new RegExp('`?' + column + '`?\\s+', 'i'));
      }
    }
  });
});
