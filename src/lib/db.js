import { createPool } from 'mariadb';

export function getDbConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10) || 3306,
        user: decodeURIComponent(url.username) || process.env.DB_USER || '',
        password: decodeURIComponent(url.password) || process.env.DB_PASSWORD || '',
        database: url.pathname?.slice(1) || process.env.DB_NAME || 'jbm_pro_auto',
        connectionLimit: 6,
        charset: 'utf8mb4',
        timezone: 'Z',
        connectTimeout: 10000,
        allowPublicKeyRetrieval: true,
        ssl: false,
      };
    } catch (error) {
      console.warn('[db] DATABASE_URL parse failed', error);
    }
  }

  return {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jbm_pro_auto',
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

