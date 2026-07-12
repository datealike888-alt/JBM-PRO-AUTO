function loadDbWithEnv(env) {
  jest.resetModules();
  process.env = {
    ...process.env,
    DATABASE_URL: '',
    DB_HOST: '',
    DB_USER: '',
    DB_PASSWORD: '',
    DB_NAME: '',
    REQUIRE_EXTERNAL_DATABASE: '',
    ALLOW_LOCAL_DATABASE: '',
    DB_SSL_MODE: '',
    DB_SSL_REJECT_UNAUTHORIZED: '',
    ...env,
  };
  jest.doMock('mariadb', () => ({
    createPool: jest.fn(() => ({
      getConnection: jest.fn(),
    })),
  }));
  return require('../src/lib/db');
}

test('external database guard rejects local docker database host', () => {
  const db = loadDbWithEnv({
    REQUIRE_EXTERNAL_DATABASE: 'true',
    DATABASE_URL: 'mysql://user:pass@db:3306/jbm',
  });

  expect(() => db.getDbConfig()).toThrow(/external remote database host/i);
});

test('external database guard rejects localhost', () => {
  const db = loadDbWithEnv({
    REQUIRE_EXTERNAL_DATABASE: 'true',
    DATABASE_URL: 'mysql://user:pass@localhost:3306/jbm',
  });

  expect(() => db.getDbConfig()).toThrow(/external remote database host/i);
});

test('development database guard allows local docker host only with explicit flag', () => {
  const db = loadDbWithEnv({
    REQUIRE_EXTERNAL_DATABASE: 'false',
    ALLOW_LOCAL_DATABASE: 'true',
    DATABASE_URL: 'mysql://user:pass@db:3306/jbm',
  });

  expect(db.getDbConfig()).toMatchObject({
    host: 'db',
    database: 'jbm',
  });
});

test('local docker host is rejected without explicit allow flag', () => {
  const db = loadDbWithEnv({
    REQUIRE_EXTERNAL_DATABASE: 'false',
    DATABASE_URL: 'mysql://user:pass@db:3306/jbm',
  });

  expect(() => db.getDbConfig()).toThrow(/external remote database host/i);
});

test('production database guard rejects root app user', () => {
  const db = loadDbWithEnv({
    REQUIRE_EXTERNAL_DATABASE: 'true',
    DATABASE_URL: 'mysql://root:pass@prod-db.example.com:3306/jbm',
  });

  expect(() => db.getDbConfig()).toThrow(/cannot be root/i);
});

test('external database guard accepts remote host candidate without exposing secret', () => {
  const db = loadDbWithEnv({
    REQUIRE_EXTERNAL_DATABASE: 'true',
    DATABASE_URL: 'mysql://user:secret@prod-db.example.com:3306/jbm',
    DB_SSL_MODE: 'required',
    DB_SSL_REJECT_UNAUTHORIZED: 'true',
  });

  const config = db.getDbConfig();
  expect(config.host).toBe('prod-db.example.com');
  expect(config.database).toBe('jbm');
  expect(config.password).toBe('secret');
  expect(config.ssl).toEqual({ rejectUnauthorized: true });
});
