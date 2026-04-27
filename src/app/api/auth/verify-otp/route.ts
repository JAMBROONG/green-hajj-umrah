import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { rateLimiter } from '@/lib/rate-limiter';

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 menit
// Format OTP boleh "12345678" atau "1234 5678" (sesuai email yg di-format).
// Strip whitespace dulu sebelum validasi.
const OTP_PATTERN = /^\d{8}$/;

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const body = await req.json();
    const email = (body?.email ?? '').trim().toLowerCase();
    // Strip semua whitespace supaya user bisa paste "1234 5678" dari email.
    const otp = String(body?.otp ?? '').replace(/\s+/g, '');

    if (!email || !otp || !OTP_PATTERN.test(otp)) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
    }

    // Rate limit per-email: 3/15min (turun dari 5).
    // Plus IP-based limit untuk mencegah botnet brute-force lewat banyak IP.
    const emailKey = `otp:verify:${email}`;
    const ipKey = `otp:verify:ip:${ip}`;
    const emailRate = rateLimiter.check(emailKey, 3, 15 * 60 * 1000, 15 * 60 * 1000);
    const ipRate = rateLimiter.check(ipKey, 20, 15 * 60 * 1000, 15 * 60 * 1000);

    if (!emailRate.allowed || !ipRate.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Silakan minta kode OTP baru.' },
        { status: 429 },
      );
    }

    const record = await prisma.password_reset_tokens.findUnique({ where: { email } });

    if (!record || !record.created_at) {
      return NextResponse.json({ error: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' }, { status: 400 });
    }

    // Check expiry
    const ageMs = Date.now() - record.created_at.getTime();
    if (ageMs > OTP_EXPIRY_MS) {
      await prisma.password_reset_tokens.delete({ where: { email } });
      return NextResponse.json({ error: 'Kode OTP sudah kadaluarsa. Silakan minta ulang.' }, { status: 400 });
    }

    // Compare OTP (bcrypt — slow by design, ~100ms cost)
    const isValid = await compare(otp, record.token);
    if (!isValid) {
      return NextResponse.json({ error: 'Kode OTP salah. Periksa kembali kode yang dikirim.' }, { status: 400 });
    }

    // OTP valid — generate reset token, replace record, reset rate limiter
    const rawResetToken = randomBytes(32).toString('hex');
    const resetTokenHash = await hash(rawResetToken, 12);

    await prisma.password_reset_tokens.update({
      where: { email },
      data: { token: resetTokenHash, created_at: new Date() },
    });

    rateLimiter.reset(emailKey);
    rateLimiter.reset(ipKey);

    return NextResponse.json({
      success: true,
      resetToken: rawResetToken,
    });
  } catch (error) {
    console.error('verify-otp error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
