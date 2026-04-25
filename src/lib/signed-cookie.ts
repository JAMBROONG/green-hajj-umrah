import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed cookie helpers untuk flag persetujuan T&C jemaah.
 *
 * Tanpa signature, user bisa set cookie `terms_accepted=1` di browser
 * sendiri dan bypass halaman agreement. Setelah patch ini, cookie
 * berisi: `<userId>.<timestamp>.<HMAC>` di mana HMAC dihitung pakai
 * AUTH_SECRET (server-only). Middleware me-verify tanpa query DB.
 *
 * Kenapa simpan userId di cookie:
 *   Mencegah cookie satu user dipakai di session user lain. Middleware
 *   bandingkan dengan token.id sebelum trust.
 */

const TWO_YEARS_SECS = 2 * 365 * 24 * 60 * 60;
const SEPARATOR = '.';

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Bukan error fatal di dev (NextAuth juga butuh secret), tapi log warning.
    console.warn('[signed-cookie] AUTH_SECRET / NEXTAUTH_SECRET tidak di-set');
    return 'INSECURE_DEV_FALLBACK_KEY';
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/**
 * Generate cookie value yang aman.
 * Format: <userIdBase64Url>.<timestamp>.<signature>
 */
export function buildTermsCookie(userId: string): { value: string; maxAge: number } {
  const userPart = Buffer.from(userId).toString('base64url');
  const ts = Date.now().toString(36);
  const payload = `${userPart}${SEPARATOR}${ts}`;
  const sig = sign(payload);
  return {
    value: `${payload}${SEPARATOR}${sig}`,
    maxAge: TWO_YEARS_SECS,
  };
}

/**
 * Verify cookie. Return userId yang accept terms, atau null kalau invalid.
 */
export function verifyTermsCookie(cookieValue: string | undefined): { userId: string; acceptedAt: number } | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split(SEPARATOR);
  if (parts.length !== 3) return null;

  const [userPart, ts, sig] = parts;
  if (!userPart || !ts || !sig) return null;

  const expected = sign(`${userPart}${SEPARATOR}${ts}`);

  // Constant-time compare supaya tidak leak via timing.
  const sigBuf = Buffer.from(sig, 'base64url');
  const expBuf = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  let userId: string;
  try {
    userId = Buffer.from(userPart, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const acceptedAt = parseInt(ts, 36);
  if (!Number.isFinite(acceptedAt)) return null;

  return { userId, acceptedAt };
}
