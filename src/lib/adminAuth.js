import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './db';
import { createSessionToken, SESSION_COOKIE_NAME, verifySessionToken } from './session';

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD_HASH = process.env.ADMIN_DEFAULT_PASSWORD_HASH || '$2b$10$/vsf/Rer2dsOFi5Qzapp8evzKAmkP9MnPjQrQUJySrAzOfl6NNnoq';
const SESSION_DURATION_DAYS = 7;

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

async function ensureColumn(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (Number(error?.errno || 0) !== 1060) throw error;
  }
}

async function ensureIndex(sql) {
  try {
    await query(sql);
  } catch (error) {
    if (![1061, 1062].includes(Number(error?.errno || 0))) throw error;
  }
}

export async function ensureAdminUsersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NULL,
      role VARCHAR(50) DEFAULT 'admin',
      is_active TINYINT(1) DEFAULT 1,
      last_login_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_admin_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await ensureColumn('ALTER TABLE admin_users ADD COLUMN display_name VARCHAR(255) NULL');
  await ensureColumn('ALTER TABLE admin_users ADD COLUMN last_login_at DATETIME NULL');
  await ensureColumn("ALTER TABLE admin_users ADD COLUMN role VARCHAR(50) DEFAULT 'admin'");
  await ensureColumn('ALTER TABLE admin_users ADD COLUMN is_active TINYINT(1) DEFAULT 1');
  await ensureIndex('ALTER TABLE admin_users ADD UNIQUE KEY idx_admin_users_username (username)');

  await query(
    `INSERT IGNORE INTO admin_users (id, username, password_hash, display_name, role, is_active)
     VALUES (?, ?, ?, ?, 'admin', 1)`,
    ['admin-default', DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD_HASH, 'JBM Admin']
  );
}

export async function ensureAdminSessionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME NULL,
      INDEX idx_admin_sessions_user_id (user_id),
      INDEX idx_admin_sessions_expires_at (expires_at),
      INDEX idx_admin_sessions_revoked_at (revoked_at),
      CONSTRAINT fk_admin_sessions_user_id
        FOREIGN KEY (user_id) REFERENCES admin_users(id)
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function validateAdminCredentials(username, password) {
  const normalizedUsername = cleanString(username, 100).toLowerCase();
  const normalizedPassword = String(password || '');
  if (!normalizedUsername || !normalizedPassword) return null;

  await ensureAdminUsersTable();
  const rows = await query(
    `SELECT id, username, password_hash, display_name, role, is_active
     FROM admin_users
     WHERE LOWER(username) = ? AND is_active = 1
     LIMIT 1`,
    [normalizedUsername]
  );
  const admin = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!admin?.password_hash) return null;

  const passwordMatched = await bcrypt.compare(normalizedPassword, admin.password_hash);
  if (!passwordMatched) return null;

  await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [admin.id]).catch(() => {});

  return {
    id: String(admin.id),
    username: admin.username,
    displayName: admin.display_name || admin.username,
    role: admin.role || 'admin',
  };
}

export async function createAdminSession(admin) {
  await ensureAdminUsersTable();
  await ensureAdminSessionsTable();

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + (SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000));
  const token = createSessionToken({
    type: 'admin',
    sessionId,
    adminId: String(admin.id),
    username: admin.username,
    role: admin.role || 'admin',
    exp: expiresAt.toISOString(),
  });

  await query(
    `INSERT INTO admin_sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [sessionId, String(admin.id), sha256(token), expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
  );

  return token;
}

export async function revokeAdminSession(token) {
  const suppliedToken = cleanString(token, 4000);
  if (!suppliedToken) return false;

  await ensureAdminSessionsTable();
  const session = await verifySessionToken(suppliedToken);
  const sessionId = cleanString(session?.sessionId, 128);
  const tokenHash = sha256(suppliedToken);

  const result = sessionId
    ? await query(
      `UPDATE admin_sessions
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE id = ? AND token_hash = ?`,
      [sessionId, tokenHash]
    )
    : await query(
      `UPDATE admin_sessions
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE token_hash = ?`,
      [tokenHash]
    );

  return Number(result?.affectedRows || 0) > 0;
}

async function findLegacyEmployeeByCode(code) {
  const normalizedCode = cleanString(code, 255);
  if (!normalizedCode) return null;

  const rows = await query(
    `SELECT id, employee_code, first_name, last_name, nickname, position
     FROM employees
     WHERE employee_code = ? AND status <> 'ลาออก'
     LIMIT 1`,
    [normalizedCode]
  ).catch(() => []);

  const employee = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!employee) return null;

  const displayName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    || employee.nickname
    || employee.employee_code;

  return {
    id: String(employee.id),
    username: employee.employee_code,
    displayName,
    role: employee.position || 'admin',
    source: 'employee-code',
  };
}

export async function resolveAuthorizedAdmin(token) {
  const suppliedToken = cleanString(token, 4000);
  if (!suppliedToken) return null;

  const configuredToken = cleanString(process.env.VEHICLE_ADMIN_TOKEN, 2000);
  if (configuredToken && suppliedToken === configuredToken) {
    return {
      id: 'env-admin-token',
      username: 'env-admin',
      displayName: 'Environment Admin',
      role: 'admin',
      source: 'env-token',
    };
  }

  const session = await verifySessionToken(suppliedToken);
  if (session?.type === 'admin' && session?.username && session?.sessionId) {
    await ensureAdminUsersTable();
    await ensureAdminSessionsTable();

    const sessionRows = await query(
      `SELECT id, user_id, expires_at, revoked_at
       FROM admin_sessions
       WHERE id = ? AND token_hash = ?
       LIMIT 1`,
      [cleanString(session.sessionId, 128), sha256(suppliedToken)]
    );
    const sessionRow = Array.isArray(sessionRows) && sessionRows.length ? sessionRows[0] : null;
    if (!sessionRow?.id || sessionRow.revoked_at) return null;
    if (new Date(sessionRow.expires_at).getTime() <= Date.now()) return null;

    const rows = await query(
      `SELECT id, username, display_name, role
       FROM admin_users
       WHERE id = ? AND LOWER(username) = ? AND is_active = 1
       LIMIT 1`,
      [String(sessionRow.user_id), cleanString(session.username, 100).toLowerCase()]
    );
    const admin = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (admin) {
      return {
        id: String(admin.id),
        username: admin.username,
        displayName: admin.display_name || admin.username,
        role: admin.role || 'admin',
        source: 'session',
      };
    }
  }

  return findLegacyEmployeeByCode(suppliedToken);
}

function readCookieToken(request) {
  try {
    if (typeof request?.cookies?.get === 'function') {
      return cleanString(request.cookies.get(SESSION_COOKIE_NAME)?.value, 4000);
    }
  } catch {}

  const cookieHeader = cleanString(request?.headers?.get?.('cookie'), 8000);
  if (!cookieHeader) return '';
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const pair = parts.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return cleanString(pair?.slice(SESSION_COOKIE_NAME.length + 1), 4000);
}

export function getAdminTokenFromRequest(request) {
  return cleanString(request?.headers?.get?.('x-vehicle-admin-token'), 4000) || readCookieToken(request);
}

export async function getAuthorizedAdminFromRequest(request) {
  return resolveAuthorizedAdmin(getAdminTokenFromRequest(request));
}

export async function isAuthorizedAdminRequest(request) {
  const admin = await getAuthorizedAdminFromRequest(request);
  return Boolean(admin);
}
