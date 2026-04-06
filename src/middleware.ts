import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Allow auth routes without login
  if (pathname.startsWith('/auth')) {
    // Redirect to home if already logged in
    if (token && pathname === '/auth/signin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Require login for all other routes
  if (!token) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Only allow jemaah role to access this application
  // @ts-ignore - token has custom fields from our auth config
  if (token.role && token.role !== 'jemaah') {
    // Redirect non-jemaah users to error page
    return NextResponse.redirect(new URL('/auth/signin?error=access_denied', req.url));
  }

  // Handle tenant from query params
  const tenant = req.nextUrl.searchParams.get('tenant') || 'default';
  
  // Check for embedded mode
  const isEmbedded = req.nextUrl.searchParams.get('embed') === 'true';

  // Add headers for access in components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant', tenant);
  requestHeaders.set('x-embedded', isEmbedded ? 'true' : 'false');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
