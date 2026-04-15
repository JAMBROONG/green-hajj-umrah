import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/mailer';
import { rateLimiter } from '@/lib/rate-limiter';

function generateOtp(): string {
  // Cryptographically secure 6-digit OTP
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 OTP requests per email per 30 minutes
    // Rate limit: 10 OTP requests per IP per 30 minutes
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const body = await req.json();
    const email = (body?.email ?? '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    const emailRateKey = `otp:email:${email}`;
    const ipRateKey    = `otp:ip:${ip}`;

    const emailCheck = rateLimiter.check(emailRateKey, 3, 30 * 60 * 1000, 30 * 60 * 1000);
    const ipCheck    = rateLimiter.check(ipRateKey,    10, 30 * 60 * 1000, 30 * 60 * 1000);

    if (!emailCheck.allowed || !ipCheck.allowed) {
      // Return generic response — don't reveal the rate limit reason
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, kode OTP akan dikirim.',
      });
    }

    // Look up user — must exist and be jemaah
    const user = await prisma.profiles.findUnique({ where: { email } });

    // Always return the same response to avoid user enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, kode OTP akan dikirim.',
    });

    if (!user || user.role !== 'jemaah') {
      // Artificial delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 500));
      return genericResponse;
    }

    const otp = generateOtp();
    const otpHash = await hash(otp, 12);

    // Upsert: one record per email
    await prisma.password_reset_tokens.upsert({
      where: { email },
      update: { token: otpHash, created_at: new Date() },
      create: { email, token: otpHash, created_at: new Date() },
    });

    await sendOtpEmail(email, otp, user.full_name ?? undefined);

    return genericResponse;
  } catch (error) {
    console.error('forgot-password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
