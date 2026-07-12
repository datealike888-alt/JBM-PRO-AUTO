import fs from 'fs';
import { createPool } from 'mariadb';

const FORBIDDEN_LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'db',
  'mysql',
  'mariadb',
  'jbm-mysql',
  'host.docker.internal',
]);

let pool;

function envFlag(name) {
  return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

export function normalizeDatabaseHost(hostname = '') {
  return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

export function isLocalDatabaseHost(hostname = '') {
  return FORBIDDEN_LOCAL_DATABASE_HOSTS.has(normalizeDatabaseHost(hostname));
}

function databaseConfigurationError(message) {
  const error = new Error(`Database configuration error: ${message}`);
  error.code = 'DATABASE_CONFIGURATION_ERROR';
  return error;
}

export function getDbConfig() {
  let config = null;

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      config = {
        host: normalizeDatabaseHost(url.hostname),
        port: parseInt(url.port, 10) || 3306,
        user: decodeURIComponent(url.username) || process.env.DB_USER || '',
        password: decodeURIComponent(url.password) || process.env.DB_PASSWORD || '',
        database: url.pathname?.slice(1) || process.env.DB_NAME || 'jbm_pro_auto',
      };
    } catch {
      throw databaseConfigurationError('DATABASE_URL is invalid.');
    }
  }

  if (!config) {
    config = {
      host: normalizeDatabaseHost(process.env.DB_HOST || ''),
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jbm_pro_auto',
    };
  }

  if (!config.host) {
    throw databaseConfigurationError('DATABASE host is required.');
  }
  if (!config.user) {
    throw databaseConfigurationError('DATABASE user is required.');
  }
  if (!config.database) {
    throw databaseConfigurationError('DATABASE name is required.');
  }

  const requireExternalDatabase = envFlag('REQUIRE_EXTERNAL_DATABASE');
  const allowLocalDatabase = envFlag('ALLOW_LOCAL_DATABASE');
  if (isLocalDatabaseHost(config.host) && (requireExternalDatabase || !allowLocalDatabase)) {
    throw databaseConfigurationError('Local Database Host is forbidden. Configure DATABASE_URL with an external remote database host.');
  }
  if (requireExternalDatabase && String(config.user || '').trim().toLowerCase() === 'root') {
    throw databaseConfigurationError('Production application database user cannot be root.');
  }

  let ssl = false;
  if (process.env.DB_SSL_MODE && process.env.DB_SSL_MODE !== 'disabled') {
    ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
    };
    if (process.env.DB_SSL_CA_PATH) {
      try {
        ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
      } catch {
        throw databaseConfigurationError('Database TLS CA certificate is unavailable.');
      }
    }
  }

  return {
    ...config,
    connectionLimit: 6,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectTimeout: 10000,
    allowPublicKeyRetrieval: process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true',
    ssl,
  };
}

export function getPool() {
  if (pool) return pool;
  pool = createPool(getDbConfig());
  return pool;
}

export async function query(sql, params = []) {
  const conn = await getPool().getConnection();
  try {
    return await conn.query(sql, params);
  } finally {
    conn?.release();
  }
}

export async function withTransaction(task) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await task(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('[db] transaction rollback failed', rollbackError);
    }
    throw error;
  } finally {
    conn?.release();
  }
}

export async function testConnection() {
  const rows = await query('SELECT 1 AS ok');
  return Array.isArray(rows) && Number(rows[0]?.ok || 0) === 1;
}
