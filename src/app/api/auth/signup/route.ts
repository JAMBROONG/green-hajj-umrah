import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { rateLimiter } from '@/lib/rate-limiter';
import { validatePasswordStrength } from '@/lib/password-validator';

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 signup per IP per 60 menit. Tanpa ini, attacker bisa
    // bikin ribuan akun dummy dalam hitungan detik (account farming).
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const ipCheck = rateLimiter.check(`signup:ip:${ip}`, 5, 60 * 60 * 1000, 60 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan pendaftaran. Coba lagi dalam 1 jam.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const rawPassword = typeof body?.password === 'string' ? body.password : '';
    const rawFullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';

    // Validasi input
    if (!rawEmail || !EMAIL_RE.test(rawEmail) || rawEmail.length > 254) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }
    if (!rawFullName || rawFullName.length < 2 || rawFullName.length > 100) {
      return NextResponse.json({ error: 'Nama lengkap minimal 2 dan maksimal 100 karakter.' }, { status: 400 });
    }
    const strength = validatePasswordStrength(rawPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    // Generic response — tidak ekspos apakah email sudah terdaftar (mitigasi
    // VA-024 account enumeration).
    const genericSuccess = NextResponse.json({
      success: true,
      message: 'Pendaftaran sedang diproses. Silakan login.',
    });

    const existingUser = await prisma.profiles.findUnique({
      where: { email: rawEmail },
      select: { id: true },
    });

    if (existingUser) {
      // Tetap return generic success biar email enumeration tidak bisa.
      // Tambah artificial delay supaya timing attack juga ke-mitigate.
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      return genericSuccess;
    }

    const hashedPassword = await hash(rawPassword, 12);

    // Get / create default tenant
    let tenant = await prisma.tenants.findUnique({ where: { slug: 'default' } });
    if (!tenant) {
      tenant = await prisma.tenants.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
          settings: {},
          branding: {},
        },
      });
    }

    await prisma.profiles.create({
      data: {
        email: rawEmail,
        password: hashedPassword,
        full_name: rawFullName,
        tenant_id: tenant.id,
        auth_provider: 'credentials',
        metadata: {},
      },
    });

    return genericSuccess;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Pendaftaran gagal. Silakan coba lagi.' },
      { status: 500 },
    );
  }
}
