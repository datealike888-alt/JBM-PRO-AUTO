import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === 'production' ? '' : 'jbm-dev-session-secret'
);

export const SESSION_COOKIE_NAME = 'jbm_session';
export const LOGOUT_MARKER_COOKIE_NAME = 'jbm_logout_marker';

function base64urlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (base64.length % 4);
  if (padding > 0 && padding < 4) {
    base64 += '='.repeat(padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signPayload(encodedPayload) {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required');
  }

  return base64urlEncode(
    crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64')
  );
}

export function createSessionToken(sessionData) {
  const payload = JSON.stringify({ ...sessionData, iat: Date.now() });
  const encoded = base64urlEncode(payload);
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (!SESSION_SECRET) return null;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = signPayload(encoded);
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = base64urlDecode(encoded);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
