#!/usr/bin/env node

require('dotenv').config();

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createPool } = require('mariadb');
const readline = require('readline/promises');

const WEAK_PASSWORDS = new Set(['admin', 'admin123', 'password', 'password123', '123456']);

function clean(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength);
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

function validateUsername(username) {
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    throw new Error('Username must be 3-50 characters and use letters, numbers, dot, dash, or underscore');
  }
}

function validatePassword(password) {
  if (password.length < 12) throw new Error('Password must be at least 12 characters');
  if (WEAK_PASSWORDS.has(password.toLowerCase())) throw new Error('Password is too weak');
}

async function promptForMissing(input) {
  if (input.username && input.displayName && input.password) return input;

  if (!process.stdin.isTTY) {
    throw new Error('ADMIN_USERNAME, ADMIN_DISPLAY_NAME, and ADMIN_PASSWORD are required when admin:create is not run interactively');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return {
      username: input.username || clean(await rl.question('Admin username: '), 100).toLowerCase(),
      displayName: input.displayName || clean(await rl.question('Display name: '), 255),
      password: input.password || String(await rl.question('Password (input may be visible in this terminal): ')),
    };
  } finally {
    rl.close();
  }
}

async function main() {
  const input = await promptForMissing({
    username: clean(process.env.ADMIN_USERNAME, 100).toLowerCase(),
    displayName: clean(process.env.ADMIN_DISPLAY_NAME, 255),
    password: String(process.env.ADMIN_PASSWORD || ''),
  });

  validateUsername(input.username);
  validatePassword(input.password);

  const pool = createPool(dbConfig());
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const existing = await conn.query('SELECT id FROM admin_users WHERE LOWER(username) = ? LIMIT 1', [input.username]);
    if (Array.isArray(existing) && existing.length > 0) {
      throw new Error('Username already exists');
    }

    const userId = `admin-${crypto.randomUUID()}`;
    const passwordHash = await bcrypt.hash(input.password, 12);
    await conn.query(
      `INSERT INTO admin_users (id, username, password_hash, display_name, role, is_active)
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [userId, input.username, passwordHash, input.displayName]
    );

    await conn.commit();
    console.log('Admin created successfully');
    console.log(`Username: ${input.username}`);
    console.log(`Display name: ${input.displayName}`);
    console.log('Role: admin');
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error(`Admin creation failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

main();
