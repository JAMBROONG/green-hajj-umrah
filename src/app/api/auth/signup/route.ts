import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    // Check if user already exists
    const existingUser = await prisma.profiles.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Get default tenant
    let tenant = await prisma.tenants.findUnique({
      where: { slug: 'default' }
    });

    // Create default tenant if it doesn't exist
    if (!tenant) {
      tenant = await prisma.tenants.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
          settings: {},
          branding: {}
        }
      });
    }

    // Create user
    const user = await prisma.profiles.create({
      data: {
        email,
        password: hashedPassword,
        full_name: fullName,
        tenant_id: tenant.id,
        auth_provider: 'credentials',
        metadata: {}
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
