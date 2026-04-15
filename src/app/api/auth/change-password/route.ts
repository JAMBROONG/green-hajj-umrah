import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { validatePasswordStrength } from '@/lib/password-validator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password saat ini dan password baru wajib diisi' },
        { status: 400 },
      );
    }

    // Validate password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const user = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password saat ini tidak sesuai' }, { status: 401 });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password saat ini' },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.profiles.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Gagal mengubah password' }, { status: 500 });
  }
}
