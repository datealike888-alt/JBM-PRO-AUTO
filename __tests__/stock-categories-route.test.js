const category = {
  id: 'source-cat',
  name: 'ผ้าเบรกหน้าพร้อมเซ็นเซอร์',
  is_active: 1,
  created_at: null,
  updated_at: null,
};

const targetCategory = {
  id: 'target-cat',
  name: 'ระบบเบรก',
  is_active: 1,
  created_at: null,
  updated_at: null,
};

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

function makeRequest(url = 'http://localhost/api/stock/categories?id=source-cat') {
  return { url, method: 'DELETE' };
}

function jsonOf(response) {
  return response.json();
}

function setupMocks({
  permissions = ['stock.delete', 'stock.update'],
  outerQuery,
  transactionQueries = [],
  transactionError,
} = {}) {
  jest.resetModules();
  const outerQueryMock = jest.fn(outerQuery || (() => Promise.resolve([])));
  const conn = {
    query: jest.fn((sql, params) => {
      if (transactionError) return Promise.reject(transactionError);
      const next = transactionQueries.shift();
      if (typeof next === 'function') return Promise.resolve(next(sql, params));
      return Promise.resolve(next || []);
    }),
  };
  const withTransactionMock = jest.fn(async (task) => task(conn));

  jest.doMock('../src/lib/stockStorage', () => ({
    cleanString: (value, maxLength = 255) => String(value || '').trim().slice(0, maxLength),
    ensureStockCategoriesTable: jest.fn().mockResolvedValue(undefined),
    ensureStockProductsTable: jest.fn().mockResolvedValue(undefined),
    normalizeStockCategoryInput: jest.fn((body) => body),
    normalizeStockCategoryRow: jest.fn((row) => ({
      id: row.id,
      name: row.name,
      is_active: Number(row.is_active) !== 0,
    })),
    query: outerQueryMock,
  }));
  jest.doMock('../src/lib/db', () => ({
    withTransaction: withTransactionMock,
  }));
  jest.doMock('../src/lib/adminPermissions', () => ({
    requirePermission: jest.fn().mockResolvedValue({
      admin: { id: 'admin-1', username: 'admin', displayName: 'Admin' },
      permissions,
    }),
    requireAnyPermission: jest.fn().mockResolvedValue({
      admin: { id: 'admin-1', username: 'admin', displayName: 'Admin' },
      permissions,
    }),
    hasPermission: jest.fn((permissionList, permissionKey) => (
      permissionList.includes('dashboard.all') || permissionList.includes(permissionKey)
    )),
  }));

  return { outerQueryMock, conn, withTransactionMock };
}

describe('stock category delete route', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('ลบหมวดหมู่ว่างสำเร็จ HTTP 200 และไม่ลบสินค้า', async () => {
    const { conn } = setupMocks({
      outerQuery: (sql) => {
        if (sql.includes('FROM stock_categories')) return Promise.resolve([category]);
        if (sql.includes('COUNT(*)')) return Promise.resolve([{ product_count: 0 }]);
        return Promise.resolve([]);
      },
      transactionQueries: [
        [category],
        [{ product_count: 0 }],
        [],
        [],
      ],
    });
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest());
    const body = await jsonOf(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(conn.query).toHaveBeenCalledWith('DELETE FROM stock_categories WHERE id = ?', ['source-cat']);
    expect(conn.query.mock.calls.some(([sql]) => /DELETE\s+FROM\s+stock_products/i.test(sql))).toBe(false);
    expect(conn.query.mock.calls.some(([sql]) => /DELETE\s+FROM\s+stock_movements/i.test(sql))).toBe(false);
  });

  it('ลบหมวดหมู่ที่มีสินค้าโดยไม่ระบุปลายทางได้ HTTP 409 พร้อม CATEGORY_IN_USE', async () => {
    setupMocks({
      outerQuery: (sql) => {
        if (sql.includes('FROM stock_categories')) return Promise.resolve([category]);
        if (sql.includes('COUNT(*)')) return Promise.resolve([{ product_count: 1 }]);
        if (sql.includes('FROM stock_products')) return Promise.resolve([
          { id: 'stk-1', code: 'TEST-BRK-003', product_name: 'ผ้าเบรกหน้าพร้อมเซ็นเซอร์' },
        ]);
        return Promise.resolve([]);
      },
    });
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest());
    const body = await jsonOf(response);

    expect(response.status).toBe(409);
    expect(body.error).toBe('CATEGORY_IN_USE');
    expect(body.product_count).toBe(1);
    expect(body.products).toEqual([
      { id: 'stk-1', code: 'TEST-BRK-003', product_name: 'ผ้าเบรกหน้าพร้อมเซ็นเซอร์' },
    ]);
  });

  it('ย้ายสินค้าไปหมวดหมู่อื่นแล้วลบสำเร็จ โดยไม่แตะ quantity ราคา หรือ movement', async () => {
    const { conn } = setupMocks({
      transactionQueries: [
        [category],
        [targetCategory],
        [{ product_count: 1 }],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { affectedRows: 1 },
      ],
    });
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest('http://localhost/api/stock/categories?id=source-cat&reassignTo=target-cat'));
    const body = await jsonOf(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      moved_product_count: 1,
      source_category_id: 'source-cat',
      target_category_id: 'target-cat',
    });
    expect(conn.query).toHaveBeenCalledWith(
      'UPDATE stock_products SET category_id = ? WHERE category_id = ?',
      ['target-cat', 'source-cat']
    );
    const sqlText = conn.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(sqlText).not.toMatch(/DELETE\s+FROM\s+stock_products/i);
    expect(sqlText).not.toMatch(/DELETE\s+FROM\s+stock_movements/i);
    expect(sqlText).not.toMatch(/\bquantity\s*=/i);
    expect(sqlText).not.toMatch(/\bprice\s*=/i);
  });

  it('source และ target เป็น ID เดียวกันต้อง HTTP 400', async () => {
    setupMocks();
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest('http://localhost/api/stock/categories?id=source-cat&reassignTo=source-cat'));
    const body = await jsonOf(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe('SOURCE_TARGET_SAME');
  });

  it('target ไม่มีอยู่ต้อง HTTP 404', async () => {
    setupMocks({
      transactionQueries: [
        [category],
        [],
      ],
    });
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest('http://localhost/api/stock/categories?id=source-cat&reassignTo=missing-cat'));
    const body = await jsonOf(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe('TARGET_CATEGORY_NOT_FOUND');
  });

  it('ไม่มี permission stock.update ตอน reassign ต้อง HTTP 403', async () => {
    setupMocks({ permissions: ['stock.delete'] });
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest('http://localhost/api/stock/categories?id=source-cat&reassignTo=target-cat'));

    expect(response.status).toBe(403);
  });

  it('error ระหว่าง transaction ไม่คืน success ปลอม', async () => {
    setupMocks({ transactionError: new Error('deadlock') });
    const { DELETE } = require('../src/app/api/stock/categories/route');

    const response = await DELETE(makeRequest('http://localhost/api/stock/categories?id=source-cat&reassignTo=target-cat'));
    const body = await jsonOf(response);

    expect(response.status).toBe(503);
    expect(body.success).not.toBe(true);
  });
});
