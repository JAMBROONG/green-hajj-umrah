import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { HajiJourney } from '@/lib/types';

export const runtime = 'nodejs'

// GET - Fetch user's journey
export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const journey = await prisma.journey.findUnique({
    where: { userId }
  });

  if (!journey) {
    // Return default journey structure
    const defaultJourney: HajiJourney = {
      currentPhase: 0,
      phases: {
        'pra-keberangkatan': { completed: false, categories: {} },
        'penerbangan-pergi': { completed: false, categories: {} },
        'madinah': { completed: false, categories: {} },
        'makkah': { completed: false, categories: {} },
        'arafah': { completed: false, categories: {} },
        'muzdalifah': { completed: false, categories: {} },
        'mina': { completed: false, categories: {} },
        'rekreasi': { completed: false, categories: {} },
        'pulang': { completed: false, categories: {} }
      }
    };

    return NextResponse.json({ journey: defaultJourney });
  }

  return NextResponse.json({ journey: journey.phases as unknown as HajiJourney });
}

// POST - Create or update journey
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { journey, totalEmission } = body;

  const userId = (session.user as any).id;
  const tenantId = (session.user as any).tenantId || process.env.NEXT_PUBLIC_DEFAULT_TENANT;

  // Upsert journey
  const data = await prisma.journey.upsert({
    where: { userId },
    create: {
      userId,
      tenantId,
      phases: journey,
      totalEmission: totalEmission || 0
    },
    update: {
      phases: journey,
      totalEmission: totalEmission || 0
    }
  });

  return NextResponse.json({ journey: data });
}
