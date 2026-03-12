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
  const trip = await prisma.trips.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      journeys: true
    }
  });

  if (!trip || !trip.journeys) {
    // Return default journey structure
    const defaultJourney = initializePhases();
    return NextResponse.json({ journey: defaultJourney });
  }

  const journeyData = trip.journeys;
  return NextResponse.json({journey: journeyData.phases as unknown as HajiJourney });
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
  let trip = await prisma.trips.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  });

  // If no trip exists, create a default one
  if (!trip) {
    trip = await prisma.trips.create({
      data: {
        name: 'Perjalanan Default',
        type: 'umrah',
        start_date: new Date(),
        end_date: new Date(),
        user_id: userId,
        tenant_id: tenantId,
        total_emission: totalEmission || 0,
        status: 'ongoing'
      }
    });
  }

  // Upsert journey data for this trip
  const data = await prisma.journey_data.upsert({
   where: { trip_id: trip.id },
    create: {
      trip_id: trip.id,
      phases: journey as Prisma.InputJsonValue,
      total_emission: totalEmission || 0
    },
    update: {
      phases: journey as Prisma.InputJsonValue,
      total_emission: totalEmission || 0
    }
  });

  // Update trip's total emission
  await prisma.trips.update({
    where: { id: trip.id },
    data: { total_emission: totalEmission || 0 }
  });

  return NextResponse.json({ journey: data });
}
