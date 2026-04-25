import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { HajiJourney, PhaseId, CategoryId, PhaseData } from "@/lib/types";
import { PHASE_DEFINITIONS } from "@/lib/constants";

export const runtime = "nodejs";

// Define required categories per phase (empty = all optional)
const PHASE_REQUIRED_CATEGORIES: Record<PhaseId, CategoryId[]> = {
  'pra-keberangkatan': ['transport'], // hotel optional
  'keberangkatan': ['transport'],
  'madinah': ['transport', 'hotel', 'food'],
  'perjalanan-antar-kota': ['transport'],
  'makkah': ['transport', 'hotel', 'food'],
  'arafah': ['transport', 'hotel', 'food'],
  'muzdalifah': ['transport', 'hotel', 'food'],
  'mina': ['transport', 'hotel', 'food'],
  'rekreasi': [], // all optional
  'kepulangan': ['transport']
};

// PUT /api/trips/[id]/journey/mark-phase-complete
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify trip belongs to user
    const trip = await prisma.trips.findFirst({
      where: {
        id,
        user_id: session.user.id as string,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await request.json();
    const { phaseId, force } = body as { phaseId: PhaseId; force?: boolean };

    if (!phaseId) {
      return NextResponse.json({ error: "Phase ID required" }, { status: 400 });
    }

    // Get journey data
    const journeyData = await prisma.journey_data.findUnique({
      where: { trip_id: id },
    });

    if (!journeyData) {
      return NextResponse.json({ error: "Journey data not found" }, { status: 404 });
    }

    // Journey is stored as HajiJourney = { currentPhase, phases: { 'pra-keberangkatan': PhaseData, ... } }
    // Legacy data may be stored flat. Handle both.
    const storedData = journeyData.phases as Record<string, any>;
    const phasesMap: Record<string, any> = storedData?.phases || storedData;
    const phaseData = phasesMap[phaseId];

    if (!phaseData) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Check ALL categories (not just required ones)
    const phaseDefinition = PHASE_DEFINITIONS.find(p => p.id === phaseId);
    const allCategoryIds = phaseDefinition?.categories || [];
    const missingCategories: string[] = [];

    console.log(`📋 Checking phase ${phaseId}, all categories:`, allCategoryIds);

    const categoryLabels: Record<string, string> = {
      'transport': 'Transportasi',
      'hotel': 'Hotel',
      'food': 'Makanan',
      'waste': 'Limbah'
    };

    allCategoryIds.forEach(catId => {
      const catData = phaseData.categories[catId];
      const emission = catData?.totalEmission ?? catData?.emission ?? 0;
      const hasData = emission > 0;
      
      console.log(`  - ${catId}: emission=${emission}, hasData=${hasData}`);
      
      if (!hasData) {
        const catLabel = categoryLabels[catId] || catId.charAt(0).toUpperCase() + catId.slice(1);
        missingCategories.push(catLabel);
      }
    });

    console.log(`⚠️ Missing categories:`, missingCategories);

    // If there are missing categories and not forcing, return warning
    if (missingCategories.length > 0 && !force) {
      console.log(`📢 Returning warning response`);
      return NextResponse.json({
        warning: true,
        message: `Kategori berikut belum diisi: ${missingCategories.join(', ')}`,
        missingCategories,
        phaseId
      }, { status: 200 });
    }

    // Mark phase as complete
    const updatedPhaseData = {
      ...phaseData,
      completed: true
    };

    const updatedPhasesMap = {
      ...phasesMap,
      [phaseId]: updatedPhaseData
    };

    // Reconstruct the full stored object preserving currentPhase etc.
    const updatedJourneyObject = storedData?.phases
      ? { ...storedData, phases: updatedPhasesMap }
      : updatedPhasesMap;

    // Update journey data
    const updatedJourneyData = await prisma.journey_data.update({
      where: { trip_id: id },
      data: {
        phases: updatedJourneyObject as Prisma.InputJsonValue,
      },
    });

    // Check if ALL phases are completed -> auto-complete trip
    const allPhasesCompleted = Object.values(updatedPhasesMap).every(
      (phase: any) => phase?.completed === true
    );

    if (allPhasesCompleted) {
      console.log('✅ All phases completed, marking trip as completed');
      await prisma.trips.update({
        where: { id },
        data: { status: 'completed' }
      });
    }

    return NextResponse.json({
      message: "Phase marked as complete",
      journey: updatedJourneyData,
      tripCompleted: allPhasesCompleted
    });
  } catch (error) {
    console.error("❌ Error marking phase complete:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: "Failed to mark phase complete" },
      { status: 500 }
    );
  }
}
