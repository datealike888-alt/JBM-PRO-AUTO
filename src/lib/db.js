import { createPool } from 'mariadb';

const createDbConfig = () => {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10) || 3306,
        user: decodeURIComponent(url.username) || process.env.DB_USER || 'root',
        password: decodeURIComponent(url.password) || process.env.DB_PASSWORD || 'root',
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
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'jbm_pro_auto',
    connectionLimit: 6,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectTimeout: 10000,
    allowPublicKeyRetrieval: true,
    ssl: false,
  };
};

const pool = createPool(createDbConfig());

export async function query(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(sql, params);
  } finally {
    conn?.release();
  }
}
