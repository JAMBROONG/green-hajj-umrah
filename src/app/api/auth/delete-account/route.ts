import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password diperlukan' }, { status: 400 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Fetch user to verify password
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    // Verify password before deletion
    const isPasswordValid = await compare(password, profile.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Kata sandi tidak sesuai' }, { status: 400 });
    }

    // Delete user data in correct order (respect foreign key constraints)
    // 1. Delete CSR activity participations
    await prisma.csr_activity_participations.deleteMany({
      where: { user_id: userId },
    });

    // 2. Delete carbon certificate purchases
    await prisma.carbon_certificate_purchases.deleteMany({
      where: { user_id: userId },
    });

    // 3. Delete trips (journey_data cascades automatically via onDelete: Cascade)
    await prisma.trips.deleteMany({
      where: { user_id: userId },
    });

    // 4. Delete password reset tokens (by email)
    try {
      await prisma.password_reset_tokens.deleteMany({
        where: { email: userEmail },
      });
    } catch {
      // Table might not exist or have different schema — non-blocking
    }

    // 5. Delete the profile (this also triggers any remaining cascades)
    await prisma.profiles.delete({
      where: { id: userId },
    });

    // Clear cookies
    const response = NextResponse.json({ success: true, message: 'Akun berhasil dihapus' });
    response.cookies.delete('terms_accepted');
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');

    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus akun. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
