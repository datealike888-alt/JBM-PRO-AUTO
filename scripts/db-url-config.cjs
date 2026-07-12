const DISALLOWED_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'host.docker.internal',
  'db',
  'mysql',
  'mariadb',
  'postgres',
  'jbm-mysql',
]);

function normalizeDatabaseHost(hostname = '') {
  return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function configurationError(message) {
  const error = new Error(`Database configuration error: ${message}`);
  error.code = 'DATABASE_CONFIGURATION_ERROR';
  return error;
}

function getDbConfigFromDatabaseUrl(env = process.env) {
  if (!env.DATABASE_URL) {
    throw configurationError('DATABASE_URL is required and must point to an external remote database host.');
  }

  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw configurationError('DATABASE_URL is invalid.');
  }

  if (!['mysql:', 'mysql2:', 'mariadb:'].includes(url.protocol)) {
    throw configurationError('DATABASE_URL must use a MySQL/MariaDB protocol.');
  }

  const host = normalizeDatabaseHost(url.hostname);
  if (!host) {
    throw configurationError('DATABASE_URL host is required.');
  }
  if (DISALLOWED_DATABASE_HOSTS.has(host)) {
    throw configurationError('Local Database Host is forbidden. Configure DATABASE_URL with an external remote database host.');
  }

  const database = decodeURIComponent(url.pathname || '').replace(/^\/+/, '');
  if (!database) {
    throw configurationError('DATABASE_URL database name is required.');
  }

  const user = decodeURIComponent(url.username || '');
  if (!user) {
    throw configurationError('DATABASE_URL username is required.');
  }
  if (user.trim().toLowerCase() === 'root') {
    throw configurationError('Production application database user cannot be root.');
  }

  return {
    host,
    port: String(url.port || '3306'),
    user,
    password: decodeURIComponent(url.password || ''),
    database,
  };
}

module.exports = {
  DISALLOWED_DATABASE_HOSTS,
  getDbConfigFromDatabaseUrl,
  normalizeDatabaseHost,
};
