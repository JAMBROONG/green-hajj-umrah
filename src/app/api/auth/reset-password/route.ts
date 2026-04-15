import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { validatePasswordStrength } from '@/lib/password-validator';

const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes after OTP verified

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email ?? '').trim().toLowerCase();
    const resetToken = (body?.resetToken ?? '').trim();
    const newPassword = body?.newPassword ?? '';

    if (!email || !resetToken || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    // Validate password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const record = await prisma.password_reset_tokens.findUnique({ where: { email } });

    if (!record || !record.created_at) {
      return NextResponse.json({ error: 'Sesi reset tidak valid atau sudah kadaluarsa.' }, { status: 400 });
    }

    // Check expiry of reset token
    const ageMs = Date.now() - record.created_at.getTime();
    if (ageMs > RESET_TOKEN_EXPIRY_MS) {
      await prisma.password_reset_tokens.delete({ where: { email } });
      return NextResponse.json({ error: 'Sesi reset sudah kadaluarsa. Silakan mulai ulang.' }, { status: 400 });
    }

    const isValid = await compare(resetToken, record.token);
    if (!isValid) {
      return NextResponse.json({ error: 'Token reset tidak valid.' }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 12);
    await prisma.profiles.update({
      where: { email },
      data: { password: hashedPassword, updated_at: new Date() },
    });

    await prisma.password_reset_tokens.delete({ where: { email } });

    return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (error) {
    console.error('reset-password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
