import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password saat ini dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Password saat ini tidak sesuai' },
        { status: 401 }
      );
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password saat ini' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.profiles.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password changed successfully for user: ${user.email}`);

    return NextResponse.json(
      { success: true, message: 'Password berhasil diubah' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error changing password:', error);

    const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah password';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
