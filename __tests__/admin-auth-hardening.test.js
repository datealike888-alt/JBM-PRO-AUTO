const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

jest.mock('../src/lib/db', () => ({
  query: jest.fn(),
}));

const { query } = require('../src/lib/db');

async function loadAdminAuth() {
  jest.resetModules();
  jest.doMock('../src/lib/db', () => ({ query }));
  return import('../src/lib/adminAuth');
}

beforeEach(() => {
  query.mockReset();
  delete process.env.VEHICLE_ADMIN_TOKEN;
  delete process.env.ADMIN_AUTH_ALLOW_TEST_TOKEN;
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-session-secret-with-at-least-48-characters-long';
});

test('validateAdminCredentials does not create or seed admin users', async () => {
  const adminAuth = await loadAdminAuth();
  query.mockResolvedValueOnce([]);

  const admin = await adminAuth.validateAdminCredentials('admin', 'wrong-password');

  expect(admin).toBeNull();
  const sqlText = query.mock.calls.map(([sql]) => String(sql)).join('\n');
  expect(sqlText).not.toMatch(/CREATE TABLE|ALTER TABLE|INSERT IGNORE|admin-default/i);
});

test('validateAdminCredentials returns active admin only when password matches', async () => {
  const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
  const adminAuth = await loadAdminAuth();
  query
    .mockResolvedValueOnce([{ ok: 1 }])
    .mockResolvedValueOnce([{
      id: 'admin-1',
      username: 'secure_admin',
      password_hash: passwordHash,
      display_name: 'Secure Admin',
      role: 'admin',
      is_active: 1,
    }])
    .mockResolvedValueOnce({ affectedRows: 1 });

  const admin = await adminAuth.validateAdminCredentials('secure_admin', 'CorrectPassword123!');

  expect(admin).toMatchObject({
    id: 'admin-1',
    username: 'secure_admin',
    displayName: 'Secure Admin',
    role: 'admin',
  });
});

test('revoked session cannot authorize admin', async () => {
  const { createSessionToken } = await import('../src/lib/session');
  const adminAuth = await loadAdminAuth();
  const token = createSessionToken({
    type: 'admin',
    sessionId: 'session-1',
    adminId: 'admin-1',
    username: 'secure_admin',
    role: 'admin',
    exp: new Date(Date.now() + 60_000).toISOString(),
  });

  query
    .mockResolvedValueOnce([{ ok: 1 }])
    .mockResolvedValueOnce([{ ok: 1 }])
    .mockResolvedValueOnce([{ id: 'session-1', user_id: 'admin-1', expires_at: new Date(Date.now() + 60_000), revoked_at: new Date() }]);

  await expect(adminAuth.resolveAuthorizedAdmin(token)).resolves.toBeNull();
});

test('production does not accept VEHICLE_ADMIN_TOKEN bypass', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  process.env.SESSION_SECRET = 'production-test-session-secret-with-at-least-48-characters-long';
  process.env.VEHICLE_ADMIN_TOKEN = 'shared-secret';
  const adminAuth = await loadAdminAuth();

  await expect(adminAuth.resolveAuthorizedAdmin('shared-secret')).resolves.toBeNull();

  process.env.NODE_ENV = originalNodeEnv;
});

test('test token bypass requires explicit test flag', async () => {
  process.env.NODE_ENV = 'test';
  process.env.ADMIN_AUTH_ALLOW_TEST_TOKEN = 'true';
  process.env.VEHICLE_ADMIN_TOKEN = 'test-secret';
  const adminAuth = await loadAdminAuth();

  await expect(adminAuth.resolveAuthorizedAdmin('test-secret')).resolves.toMatchObject({
    source: 'env-token',
  });
});

test('admin auth migration does not seed or delete admin data', () => {
  const migration = fs.readFileSync(path.join(process.cwd(), 'db', 'migration-20260712-admin-auth-hardening.sql'), 'utf8');
  expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS admin_users/i);
  expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS admin_sessions/i);
  expect(migration).not.toMatch(/INSERT\s+IGNORE|admin-default|DELETE\s+FROM\s+admin_users|DROP\s+TABLE/i);
});

test('production compose keeps only web service and removes stale cron/database services', () => {
  const compose = fs.readFileSync(path.join(process.cwd(), '..', 'docker-compose.production.yml'), 'utf8');
  expect(compose).toMatch(/services:\s*\n\s+web:/);
  expect(compose).not.toMatch(/\n\s+(db|mysql|mariadb|phpmyadmin|cron-reminder):/);
  expect(compose).not.toMatch(/enrollment-expiry-reminders|CRON_SECRET/);
  expect(compose).toMatch(/REQUIRE_EXTERNAL_DATABASE:\s+"true"/);
  expect(compose).toMatch(/DB_SSL_REJECT_UNAUTHORIZED:\s+"true"/);
});
