import { createPool } from 'mariadb';



function getDbConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 3306,
      user: decodeURIComponent(url.username) || process.env.DB_USER || 'root',
      password: decodeURIComponent(url.password) || process.env.DB_PASSWORD || '',
      database: url.pathname?.slice(1) || process.env.DB_NAME || 'jbm_pro_auto',
      connectionLimit: 1,
      connectTimeout: 3000,
    };
  }

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jbm_pro_auto',
    connectionLimit: 1,
    connectTimeout: 3000,
  };
}

export async function GET() {
  const checks = {
    app: 'ok',
    database: 'unknown',
  };

  let status = 200;
  let pool;

  try {
    pool = createPool(getDbConfig());
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'degraded';
    status = 503;
  } finally {
    await pool?.end();
  }

  return Response.json(
    {
      status: status === 200 ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
