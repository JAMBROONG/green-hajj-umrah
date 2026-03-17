import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get('tenant') || 'default';

  const tenant = await prisma.tenants.findUnique({
    where: { slug: tenantSlug }
  });

  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ tenant });
}

// PUT /api/tenants - Update current user's tenant
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to find their tenant_id
    const profile = await prisma.profiles.findUnique({
      where: { id: token.sub as string },
      select: { tenant_id: true },
    });

    if (!profile || !profile.tenant_id) {
      return NextResponse.json(
        { error: 'User tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tenant name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Generate slug from name (simple version: lowercase and replace spaces with dashes)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check if slug already exists (excluding current tenant)
    const existingTenant = await prisma.tenants.findUnique({
      where: { slug },
    });

    if (existingTenant && existingTenant.id !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant slug already exists' },
        { status: 400 }
      );
    }

    const updatedTenant = await prisma.tenants.update({
      where: { id: profile.tenant_id },
      data: {
        name: name.trim(),
        slug: slug || profile.tenant_id, // fallback to tenant_id if slug is empty
      },
    });

    return NextResponse.json({ tenant: updatedTenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}
