import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

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

    const currentMetadata = (profile.metadata as Record<string, unknown>) ?? {};

    // Save acceptance timestamp to metadata
    await prisma.profiles.update({
      where: { id: userId },
      data: {
        metadata: {
          ...currentMetadata,
          terms_accepted_at: now,
          terms_version: '1.0',
        },
      },
    });

    // Set a persistent cookie so middleware can check without querying DB
    const response = NextResponse.json({ success: true });
    response.cookies.set('terms_accepted', '1', {
      httpOnly: true, // not readable via JS — checked server-side in middleware only
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Accept terms error:', error);
    return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 });
  }
}
