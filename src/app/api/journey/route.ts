import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { HajiJourney } from '@/lib/types';
import { initializePhases } from '@/lib/utils';

export const runtime = 'nodejs'

// GET - Fetch user's journey (backward compatibility - gets first trip's journey)
export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user's first trip (for backward compatibility)
  const trip = await prisma.trip.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      journeys: true
    }
  });

  if (!trip || !trip.journeys || trip.journeys.length === 0) {
    // Return default journey structure
    const defaultJourney = initializePhases();
    return NextResponse.json({ journey: defaultJourney });
  }

  const journeyData = trip.journeys[0];
  return NextResponse.json({ journey: journeyData.phases as unknown as HajiJourney });
}

// POST - Create or update journey (backward compatibility - updates first trip's journey)
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { journey, totalEmission } = body;

  const userId = session.user.id;
  const tenantId = session.user.tenantId || process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default';

  // Get user's first trip (for backward compatibility)
  let trip = await prisma.trip.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  // If no trip exists, create a default one
  if (!trip) {
    trip = await prisma.trip.create({
      data: {
        name: 'Perjalanan Default',
        type: 'umrah',
        startDate: new Date(),
        endDate: new Date(),
        userId,
        tenantId,
        totalEmission: totalEmission || 0,
        status: 'ongoing'
      }
    });
  }

  // Upsert journey data for this trip
  const data = await prisma.journeyData.upsert({
    where: { tripId: trip.id },
    create: {
      tripId: trip.id,
      phases: journey as Prisma.InputJsonValue,
      totalEmission: totalEmission || 0
    },
    update: {
      phases: journey as Prisma.InputJsonValue,
      totalEmission: totalEmission || 0
    }
  });

  // Update trip's total emission
  await prisma.trip.update({
    where: { id: trip.id },
    data: { totalEmission: totalEmission || 0 }
  });

  return NextResponse.json({ journey: data });
}
