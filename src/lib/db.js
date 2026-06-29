import { createPool } from 'mariadb';

export function getDbConfig() {
  const isDev = process.env.NODE_ENV === 'development';
  let config = null;

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      config = {
        host: url.hostname,
        port: parseInt(url.port, 10) || 3306,
        user: decodeURIComponent(url.username) || process.env.DB_USER || '',
        password: decodeURIComponent(url.password) || process.env.DB_PASSWORD || '',
        database: url.pathname?.slice(1) || process.env.DB_NAME || 'jbm_pro_auto',
      };
    } catch (error) {
      console.warn('[db] DATABASE_URL parse failed', error);
    }
  }

  if (!config) {
    config = {
      host: process.env.DB_HOST || '',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jbm_pro_auto',
    };
  }

  if (!isDev) {
    if (!config.host || config.host === '127.0.0.1' || config.host === 'localhost' || config.host === '0.0.0.0') {
      throw new Error('DATABASE_URL is required in production and must point to a real database server. Using a local database (127.0.0.1, localhost) is forbidden in production environments.');
    }
  }

  return {
    ...config,
    connectionLimit: 6,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectTimeout: 10000,
    allowPublicKeyRetrieval: true,
    ssl: false,
  };
}

const pool = createPool(getDbConfig());

export async function query(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(sql, params);
  } finally {
    conn?.release();
  }
}

export async function testConnection() {
  const rows = await query('SELECT 1 AS ok');
  return Array.isArray(rows) && Number(rows[0]?.ok || 0) === 1;
}

