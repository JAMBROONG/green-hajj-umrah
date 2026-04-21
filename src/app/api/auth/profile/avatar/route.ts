import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { avatarUrl } = body;

    const user = await prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { metadata: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const newMetadata = typeof user.metadata === 'object' && user.metadata !== null 
      ? { ...user.metadata } 
      : {};
    
    (newMetadata as any).avatar_url = avatarUrl;

    const updatedProfile = await prisma.profiles.update({
      where: { id: session.user.id },
      data: {
        metadata: newMetadata,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}
