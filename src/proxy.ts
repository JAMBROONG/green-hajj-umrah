import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Add security headers to every non-redirect response. */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=()');
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return res;
}

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

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
      if (termsCookie) {
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

  // 5. Terms & Conditions check — must have accepted before accessing the app
  const termsCookie = req.cookies.get('terms_accepted');
  if (!termsCookie) {
    return NextResponse.redirect(new URL('/auth/agreement', req.url));
  }

  // 6. Add headers for access in components
  const tenant = req.nextUrl.searchParams.get('tenant') || 'default';
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
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     * - static asset extensions (images, pdf, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico|json|js|css|woff|woff2|ttf)$).*)',
  ],
};
