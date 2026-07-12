#!/usr/bin/env node

require('dotenv').config();

const { createPool } = require('mariadb');

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : '';
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function command() {
  return process.argv[2] || 'help';
}

function dbConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  const url = new URL(process.env.DATABASE_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: url.pathname.slice(1),
    connectionLimit: 2,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectTimeout: 10000,
    allowPublicKeyRetrieval: process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true',
    ssl: process.env.DB_SSL_MODE && process.env.DB_SSL_MODE !== 'disabled'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false,
  };
}

function usage() {
  console.log([
    'Usage:',
    '  npm run admin:security -- list',
    '  npm run admin:security -- revoke-sessions --username=<username> [--confirm]',
    '  npm run admin:security -- disable --username=<username> --confirm',
    '  npm run admin:security -- cleanup-sessions [--days=30] [--confirm]',
    '',
    'Defaults are read-only or dry-run. Password hashes and tokens are never printed.',
  ].join('\n'));
}

async function findAdmin(conn, username) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) throw new Error('username is required');
  const rows = await conn.query(
    `SELECT id, username, display_name, role, is_active, created_at, last_login_at
     FROM admin_users
     WHERE LOWER(username) = ?
     LIMIT 1`,
    [cleanUsername]
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function activeAdminCount(conn) {
  const rows = await conn.query('SELECT COUNT(*) AS cnt FROM admin_users WHERE is_active = 1');
  return Number(rows?.[0]?.cnt || 0);
}

async function list(conn) {
  const rows = await conn.query(
    `SELECT id, username, display_name, role, is_active, created_at, last_login_at
     FROM admin_users
     ORDER BY created_at ASC`
  );
  for (const admin of rows || []) {
    console.log(JSON.stringify({
      id: String(admin.id),
      username: admin.username,
      display_name: admin.display_name || '',
      role: admin.role || 'admin',
      is_active: Number(admin.is_active) === 1,
      created_at: admin.created_at,
      last_login_at: admin.last_login_at,
    }));
  }
}

async function revokeSessions(conn, username, confirm) {
  const admin = await findAdmin(conn, username);
  if (!admin) throw new Error('admin user not found');
  const rows = await conn.query(
    'SELECT COUNT(*) AS cnt FROM admin_sessions WHERE user_id = ? AND revoked_at IS NULL',
    [String(admin.id)]
  );
  const count = Number(rows?.[0]?.cnt || 0);
  if (!confirm) {
    console.log(`Dry-run: would revoke ${count} active session(s) for ${admin.username}`);
    return;
  }
  const result = await conn.query(
    'UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ? AND revoked_at IS NULL',
    [String(admin.id)]
  );
  console.log(`Revoked sessions for ${admin.username}: ${Number(result?.affectedRows || 0)}`);
}

async function disable(conn, username, confirm) {
  const admin = await findAdmin(conn, username);
  if (!admin) throw new Error('admin user not found');
  if (Number(admin.is_active) !== 1) {
    console.log(`${admin.username} is already inactive`);
    return;
  }
  if ((await activeAdminCount(conn)) <= 1) {
    throw new Error('refusing to disable the last active admin');
  }
  if (!confirm) {
    console.log(`Dry-run: would disable ${admin.username} and revoke active sessions`);
    return;
  }
  await conn.beginTransaction();
  try {
    await conn.query('UPDATE admin_users SET is_active = 0 WHERE id = ?', [String(admin.id)]);
    await conn.query(
      'UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ? AND revoked_at IS NULL',
      [String(admin.id)]
    );
    await conn.commit();
    console.log(`Disabled ${admin.username} and revoked active sessions`);
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

async function cleanupSessions(conn, days, confirm) {
  const retentionDays = Math.max(30, Number(days || 30));
  const rows = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM admin_sessions
     WHERE (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL ? DAY))
        OR (expires_at < DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [retentionDays, retentionDays]
  );
  const count = Number(rows?.[0]?.cnt || 0);
  if (!confirm) {
    console.log(`Dry-run: would delete ${count} expired/revoked session(s) older than ${retentionDays} days`);
    return;
  }
  const result = await conn.query(
    `DELETE FROM admin_sessions
     WHERE (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL ? DAY))
        OR (expires_at < DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [retentionDays, retentionDays]
  );
  console.log(`Deleted old sessions: ${Number(result?.affectedRows || 0)}`);
}

async function main() {
  const cmd = command();
  if (cmd === 'help') {
    usage();
    return;
  }

  const pool = createPool(dbConfig());
  let conn;
  try {
    conn = await pool.getConnection();
    if (cmd === 'list') await list(conn);
    else if (cmd === 'revoke-sessions') await revokeSessions(conn, arg('username'), hasFlag('confirm'));
    else if (cmd === 'disable') await disable(conn, arg('username'), hasFlag('confirm'));
    else if (cmd === 'cleanup-sessions') await cleanupSessions(conn, arg('days'), hasFlag('confirm'));
    else {
      usage();
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Admin security command failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

main();
