import { promises as dns } from 'node:dns';
import net from 'node:net';

/**
 * Cek apakah IP literal masuk range private/reserved (RFC1918, link-local,
 * loopback, cloud metadata, dll). Dipakai untuk mencegah SSRF saat avatar
 * URL dipakai untuk fetch image dari server.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0) return true;                // 0.0.0.0/8 — non-routable
    if (a === 10) return true;               // 10.0.0.0/8
    if (a === 127) return true;              // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + AWS metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true;               // 224.0.0.0/4 multicast + 240/4 reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local, ::ffff:* (IPv4-mapped)
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.replace('::ffff:', '');
      if (net.isIPv4(v4)) return isPrivateOrReservedIp(v4);
    }
    return false;
  }

  // Bukan IP valid sama sekali — anggap unsafe
  return true;
}

/**
 * Hostname yang secara eksplisit diblokir (cloud metadata services + alias
 * lokal). Pemeriksaan ini berlaku TANPA DNS lookup, jadi cepat & deterministic.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  'ip6-localhost',
  'ip6-loopback',
]);

export interface AvatarUrlCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Validasi avatar URL sebelum disimpan ke profiles.metadata.
 *
 * Bentuk yang diizinkan:
 *   1. Empty / null     → boleh (artinya hapus avatar)
 *   2. data:image/...   → boleh (base64, tidak ada network fetch)
 *   3. Relative path    → boleh (ditangani oleh image-proxy)
 *   4. http(s)://...    → harus lulus check: bukan private IP literal,
 *                         bukan blocked hostname.
 *
 * Catatan: untuk hostname domain (mis. evil.com), kita TIDAK lakukan DNS
 * lookup di sini supaya cepat. Defense-in-depth dilakukan saat fetch
 * (lihat avatar-fetcher) di mana kita resolve DNS dan re-check.
 */
export function validateAvatarUrl(url: unknown): AvatarUrlCheck {
  if (url === null || url === undefined || url === '') {
    return { ok: true };
  }
  if (typeof url !== 'string') {
    return { ok: false, reason: 'avatarUrl harus berupa string' };
  }

  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    return { ok: false, reason: 'avatarUrl terlalu panjang (max 2048 char)' };
  }

  // 1) Data URI gambar — aman, tidak fetch network
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(trimmed)) {
    return { ok: true };
  }

  // 2) Relative path (mulai dengan '/' tapi bukan '//')
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { ok: true };
  }

  // 3) Absolute URL — wajib http/https
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'URL tidak valid' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Hanya http(s) yang diizinkan' };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: 'Hostname tidak diizinkan' };
  }

  // Block IP literal yang masuk range private/reserved
  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    return { ok: false, reason: 'IP private/reserved tidak diizinkan' };
  }

  return { ok: true };
}

/**
 * Resolve hostname via DNS dan pastikan TIDAK ADA satupun A/AAAA record yang
 * masuk private range. Dipakai sebagai defense-in-depth saat hendak fetch.
 *
 * Return true kalau aman, false kalau salah satu IP unsafe (atau lookup gagal).
 */
export async function isHostnameSafeForFetch(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(host)) return false;

  // IP literal — langsung cek
  if (net.isIP(host)) {
    return !isPrivateOrReservedIp(host);
  }

  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (records.length === 0) return false;
    return records.every((r) => !isPrivateOrReservedIp(r.address));
  } catch {
    // DNS lookup gagal — anggap unsafe (defensive)
    return false;
  }
}
