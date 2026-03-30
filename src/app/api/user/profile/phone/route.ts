import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return NextResponse.json(
        { error: 'Phone number is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Update profile metadata with phone number
    const profile = await prisma.profiles.findUnique({
      where: { id: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updatedProfile = await prisma.profiles.update({
      where: { id: session.user.id },
      data: {
        metadata: {
          ...profile.metadata,
          phone: phone.trim(),
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      profile: {
        id: updatedProfile.id,
        full_name: updatedProfile.full_name,
        email: updatedProfile.email,
        phone: updatedProfile.metadata?.phone,
        tenant_id: updatedProfile.tenant_id,
        tenant: updatedProfile.tenant,
      },
    });
  } catch (error) {
    console.error('Error updating phone:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}
