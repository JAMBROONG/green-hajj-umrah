import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email ?? '').trim().toLowerCase();
    const otp = (body?.otp ?? '').trim();

    if (!email || !otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
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

    // Compare OTP
    const isValid = await compare(otp, record.token);
    if (!isValid) {
      return NextResponse.json({ error: 'Kode OTP salah. Periksa kembali kode yang dikirim.' }, { status: 400 });
    }

    // OTP valid → generate reset token, replace record
    const rawResetToken = randomBytes(32).toString('hex');
    const resetTokenHash = await hash(rawResetToken, 12);

    await prisma.password_reset_tokens.update({
      where: { email },
      data: { token: resetTokenHash, created_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      resetToken: rawResetToken,
    });
  } catch (error) {
    console.error('verify-otp error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
