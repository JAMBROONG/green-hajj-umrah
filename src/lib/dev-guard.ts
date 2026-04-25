import { NextResponse } from 'next/server';

/**
 * Returns a 404 response if NODE_ENV === 'production'.
 *
 * Dipakai oleh endpoint debug/seed/manual-update agar tidak bisa dipanggil
 * di production. Dipisah ke helper supaya seragam dan mudah di-audit.
 *
 * Usage:
 *   const blocked = denyInProduction()
 *   if (blocked) return blocked
 */
export function denyInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}
