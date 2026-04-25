import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { buildTermsCookie } from '@/lib/signed-cookie';
import { mergeAndSanitizeMetadata } from '@/lib/profile-metadata';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date().toISOString();

    // Fetch current metadata
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Save acceptance timestamp to metadata (DB = source of truth).
    // mergeAndSanitizeMetadata: strip key tidak dikenal + validate per field.
    const newMetadata = mergeAndSanitizeMetadata(profile.metadata, {
      terms_accepted_at: now,
      terms_version: '1.0',
    });

    await prisma.profiles.update({
      where: { id: userId },
      data: {
        metadata: newMetadata,
      },
    });

    // Set SIGNED cookie. Tanpa signature, user bisa set
    // `terms_accepted=1` manual di browser dan bypass agreement.
    // Cookie sekarang: <userId>.<timestamp>.<HMAC(userId+ts, AUTH_SECRET)>
    // Middleware verify HMAC + cocokkan userId dengan token JWT.
    const { value, maxAge } = buildTermsCookie(userId);
    const response = NextResponse.json({ success: true });
    response.cookies.set('terms_accepted', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Accept terms error:', error);
    return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 });
  }
}
