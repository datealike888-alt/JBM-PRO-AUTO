import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './db';
import { createSessionToken, SESSION_COOKIE_NAME, verifySessionToken } from './session';

const SESSION_DURATION_DAYS = 7;
const AUTH_SCHEMA_ERROR_CODE = 'ADMIN_AUTH_SCHEMA_NOT_READY';

function cleanString(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function authSchemaError(tableName, cause) {
  const error = new Error(`Admin authentication schema is not ready: ${tableName}`);
  error.code = AUTH_SCHEMA_ERROR_CODE;
  error.cause = cause;
  return error;
}

async function assertTableReadable(tableName) {
  try {
    await query(`SELECT 1 FROM ${tableName} LIMIT 0`);
  } catch (error) {
    throw authSchemaError(tableName, error);
  }
}

export async function ensureAdminUsersTable() {
  await assertTableReadable('admin_users');
}

export async function ensureAdminSessionsTable() {
  await assertTableReadable('admin_sessions');
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

  const adminRows = await query(
    `SELECT id, username, role
     FROM admin_users
     WHERE id = ? AND LOWER(username) = ? AND is_active = 1
     LIMIT 1`,
    [String(admin.id), cleanString(admin.username, 100).toLowerCase()]
  );
  const activeAdmin = Array.isArray(adminRows) && adminRows.length ? adminRows[0] : null;
  if (!activeAdmin) throw new Error('Admin account is not active');

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + (SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000));
  const token = createSessionToken({
    type: 'admin',
    sessionId,
    adminId: String(activeAdmin.id),
    username: activeAdmin.username,
    role: activeAdmin.role || 'admin',
    exp: expiresAt.toISOString(),
  });

  await query(
    `INSERT INTO admin_sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [sessionId, String(admin.id), sha256(token), expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
  );

  return token;
}

export async function revokeCurrentAdminSession(token) {
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

export async function revokeAdminSession(token) {
  return revokeCurrentAdminSession(token);
}

export async function revokeAllAdminSessions(userId) {
  const userIdStr = cleanString(userId, 64);
  if (!userIdStr) return 0;

  await ensureAdminSessionsTable();
  const result = await query(
    `UPDATE admin_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = ? AND revoked_at IS NULL`,
    [userIdStr]
  );

  return Number(result?.affectedRows || 0);
}

export async function resolveAuthorizedAdmin(token) {
  const suppliedToken = cleanString(token, 4000);
  if (!suppliedToken) return null;

  const configuredToken = cleanString(process.env.VEHICLE_ADMIN_TOKEN, 2000);
  const allowTestToken = process.env.NODE_ENV === 'test' && String(process.env.ADMIN_AUTH_ALLOW_TEST_TOKEN || '').toLowerCase() === 'true';
  if (allowTestToken && configuredToken && suppliedToken === configuredToken) {
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

    if (session.exp && new Date(session.exp).getTime() <= Date.now()) return null;

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

  return null;
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
