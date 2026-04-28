import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { verifyTermsCookie } from '@/lib/signed-cookie';

/**
 * Content-Security-Policy header.
 *
 * `'unsafe-inline'` & `'unsafe-eval'` di script-src masih dibutuhkan oleh
 * Next.js (hydration scripts, Turbopack HMR, dan Midtrans Snap iframe).
 * Pengetatan lebih lanjut butuh Next.js nonce-based CSP — ke depan.
 *
 * Fokus utama CSP saat ini:
 *   - script-src dipersempit ke 'self' + Midtrans CDN (mitigasi VA-027:
 *     kalau Midtrans CDN compromise / ada injection, browser tetap blokir
 *     script dari host lain).
 *   - object-src 'none' untuk total blokir flash/plugin.
 *   - frame-src membolehkan Midtrans Snap popup tetap berjalan.
 *   - connect-src membatasi fetch ke origin self + Midtrans API.
 *   - default-src 'self' agar segala fetch tipe lain di-deny by default.
 */
const MIDTRANS_HOSTS = [
  'https://app.midtrans.com',
  'https://app.sandbox.midtrans.com',
  'https://api.midtrans.com',
  'https://api.sandbox.midtrans.com',
].join(' ');

// OpenStreetMap services untuk fitur lokasi & rute:
//   - nominatim: pencarian lokasi by nama (geocoding) di form alamat
//   - router OSRM: hitung jarak driving antar dua koordinat (mis. transport antar fase)
const GEOCODING_HOSTS = [
  'https://nominatim.openstreetmap.org',
  'https://router.project-osrm.org',
].join(' ');

// Google Maps embed iframe — dipakai di carbon-market/project/[id] untuk
// menampilkan lokasi proyek karbon. Hanya butuh di `frame-src`, bukan
// `connect-src` (iframe load, bukan fetch).
const MAPS_FRAME_HOSTS = [
  'https://www.google.com',
  'https://maps.google.com',
].join(' ');

const CSP_VALUE = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${MIDTRANS_HOSTS}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${MIDTRANS_HOSTS} ${GEOCODING_HOSTS}`,
  `frame-src 'self' ${MIDTRANS_HOSTS} ${MAPS_FRAME_HOSTS}`,
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Add security headers to every non-redirect response. */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // geolocation=(self) — fitur "deteksi lokasi otomatis" di form alamat butuh
  // permission ini untuk same-origin. camera & microphone tetap deny — tidak
  // ada feature yang butuh mereka di app jemaah.
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.headers.set('Content-Security-Policy', CSP_VALUE);
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  return res;
}

/**
 * API path yang BOLEH diakses tanpa login. Semua /api/* lain di-block oleh
 * middleware kalau JWT tidak ada — defense-in-depth, supaya kalau handler
 * lupa panggil auth(), middleware tetap nahan request anonim.
 *
 * Pattern: prefix match (cek pakai startsWith).
 */
const PUBLIC_API_PREFIXES = [
  '/api/auth',                                          // NextAuth + signup/forgot/reset/otp/check-tenant
  '/api/webhooks/',                                     // Midtrans webhook
  '/api/carbon-products/purchase/notification',         // Midtrans S2S notification
  '/api/carbon-products/purchase/handle-redirect',      // Midtrans browser redirect setelah bayar
  '/api/csr-activities/participate/notification',       // Midtrans S2S notification CSR
  '/api/payment-config/check',                          // Pre-checkout availability check
  '/api/tenants',                                       // Public tenant lookup
  // /api/debug/users hanya dibuka saat dev — Quick Login panel di /auth/signin
  // perlu fetch list jemaah sebelum login. Endpoint itu sendiri sudah guard
  // dengan `NODE_ENV !== 'development' → 404` (lihat route.ts), jadi di prod
  // tetap tidak akan jalan walaupun lolos middleware.
  ...(process.env.NODE_ENV === 'development' ? ['/api/debug/users'] : []),
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => {
    // Strict prefix match: hanya boleh exact-match atau prefix yang diikuti '/'.
    // Pencocokan ini mencegah '/api/tenants-something' lolos lewat '/api/tenants'.
    if (p.endsWith('/')) return pathname.startsWith(p);
    return pathname === p || pathname.startsWith(p + '/');
  });
}

/**
 * Path yang dibebaskan dari CSRF Origin check. Endpoint ini menerima
 * request dari pihak ketiga yang TIDAK kirim Origin header sesuai host
 * kita (Midtrans webhook dari server mereka, NextAuth signin form yang
 * sudah punya CSRF token sendiri, dll).
 */
const CSRF_EXEMPT_PREFIXES = [
  '/api/auth',                                          // NextAuth punya CSRF token sendiri
  '/api/webhooks/',                                     // Midtrans S2S webhook
  '/api/carbon-products/purchase/notification',         // Midtrans S2S
  '/api/csr-activities/participate/notification',       // Midtrans S2S
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => {
    if (p.endsWith('/')) return pathname.startsWith(p);
    return pathname === p || pathname.startsWith(p + '/');
  });
}

/**
 * CSRF check sederhana: Origin header (atau fallback Referer) harus match
 * host kita. Browser otomatis kirim Origin pada cross-origin POST/PUT/etc,
 * jadi attacker dari evil.com tidak bisa nyamar request browser user.
 */
function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  if (!host) return false;

  if (origin) {
    try {
      const o = new URL(origin);
      return o.host === host;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const r = new URL(referer);
      return r.host === host;
    } catch {
      return false;
    }
  }

  // Tidak ada Origin maupun Referer pada request browser yang state-changing
  // sangat jarang. Tolak by default supaya defensive.
  return false;
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // === A. /api/* handling — middleware-level auth wall + CSRF guard ===
  if (pathname.startsWith('/api/')) {
    // CSRF: state-changing API harus same-origin (Origin/Referer match host).
    // Webhook Midtrans & NextAuth dikecualikan via CSRF_EXEMPT_PREFIXES.
    if (
      STATE_CHANGING_METHODS.has(req.method) &&
      !isCsrfExempt(pathname) &&
      !isSameOriginRequest(req)
    ) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'CSRF: cross-origin request rejected' }, { status: 403 }),
      );
    }

    if (isPublicApi(pathname)) {
      return withSecurityHeaders(NextResponse.next());
    }
    // Protected API: tolak kalau tidak ada JWT.
    if (!token) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      );
    }
    // Hanya jemaah yang boleh akses API aplikasi ini
    if (token.role && token.role !== 'jemaah') {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // === B. /api di-luar pattern /api/* sudah di-handle oleh matcher exclude ===

  // 1. Completely public routes — no login required
  const publicPaths = ['/legal', '/offline'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 2. Auth routes (signin, forgot-password, reset, otp, agreement)
  if (pathname.startsWith('/auth')) {
    // If logged in and already accepted terms, redirect away from signin
    if (token && pathname === '/auth/signin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Agreement page requires a valid token (must be logged in)
    if (pathname === '/auth/agreement' && !token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // If logged in + already accepted terms + trying to access agreement, redirect home
    if (pathname === '/auth/agreement' && token) {
      const termsCookie = req.cookies.get('terms_accepted');
      const verified = verifyTermsCookie(termsCookie?.value);
      // Cookie wajib lulus HMAC verify DAN userId-nya match dengan token JWT.
      if (verified && verified.userId === (token.id as string | undefined)) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return withSecurityHeaders(NextResponse.next());
  }

  // 3. Require login for all other routes
  if (!token) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 4. Only allow jemaah role to access this application
  if (token.role && token.role !== 'jemaah') {
    return NextResponse.redirect(new URL('/auth/signin?error=access_denied', req.url));
  }

  // 5. Terms & Conditions check — must have accepted before accessing the app.
  // Cookie wajib signed (HMAC) dan userId di cookie HARUS match user yg login,
  // supaya tidak bisa di-forge / re-use cookie user lain.
  const termsCookie = req.cookies.get('terms_accepted');
  const verifiedTerms = verifyTermsCookie(termsCookie?.value);
  if (!verifiedTerms || verifiedTerms.userId !== (token.id as string | undefined)) {
    return NextResponse.redirect(new URL('/auth/agreement', req.url));
  }

  // 6. Add headers for access in components.
  //
  // x-tenant DULU dibaca dari `?tenant=xxx` (user-controlled query param).
  // Itu memungkinkan tenant spoofing kalau ada komponen down-stream yang
  // trust header ini. Sekarang sumbernya JWT (sudah di-sign), jadi tidak
  // bisa dipalsukan. Fallback ke 'default' kalau token tidak punya
  // tenant (akun lama / non-jemaah yang lolos check di atas — tidak
  // mungkin tapi defensive).
  const tokenTenant = (token.tenant as { slug?: string } | undefined)?.slug;
  const tenant = tokenTenant || 'default';
  const isEmbedded = req.nextUrl.searchParams.get('embed') === 'true';

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant', tenant);
  requestHeaders.set('x-embedded', isEmbedded ? 'true' : 'false');

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return withSecurityHeaders(res);
}

export const config = {
  matcher: [
    /*
     * Match:
     *   - Semua /api/* (kecuali NextAuth internal — itu jalannya tetap karena
     *     /api/auth ada di PUBLIC_API_PREFIXES)
     *   - Semua page route (kecuali static asset)
     *
     * Skip:
     *   - _next/static, _next/image, favicon, manifest, dan static asset
     *     berdasarkan ekstensi file.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico|json|js|css|woff|woff2|ttf)$).*)',
  ],
};
