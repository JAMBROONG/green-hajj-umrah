import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/debug/users
 *
 * Returns list jemaah users untuk Quick Login panel di /auth/signin.
 *
 * SECURITY: endpoint ini HANYA aktif saat NODE_ENV === 'development'.
 * Di produksi, endpoint mengembalikan 404 supaya daftar user tidak bocor
 * sebagai vektor enumerasi email/phishing.
 *
 * Scope: hanya user role='jemaah' yang tenant-nya aktif. Admin/company
 * tidak dikembalikan (dan tidak bisa login ke aplikasi jemaah anyway,
 * lihat auth.ts authorize callback).
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const users = await prisma.profiles.findMany({
      where: {
        role: 'jemaah',
        tenant: { is_active: true },
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        tenant_id: true,
        tenant: { select: { name: true, slug: true } },
      },
      orderBy: [
        { tenant_id: 'asc' },
        { full_name: 'asc' },
      ],
      take: 100,
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
