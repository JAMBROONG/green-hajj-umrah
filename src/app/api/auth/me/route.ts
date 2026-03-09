import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile with tenant info
  const profile = await prisma.profile.findUnique({
    where: { id: session.user.id },
    include: { tenant: true }
  });

  return NextResponse.json({
    user: session.user,
    profile,
  });
}
