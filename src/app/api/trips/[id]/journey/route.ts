import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/trips/[id]/journey - Get journey data (phases) for a trip
export async function GET(
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

    // Get journey data
    const journeyData = await prisma.journey_data.findUnique({
      where: {
        trip_id: id,
      },
    });

    if (!journeyData) {
      return NextResponse.json(
        { error: "Journey data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ journey: journeyData });
  } catch (error) {
    console.error("Error fetching journey data:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey data" },
      { status: 500 }
    );
  }
}

// PUT /api/trips/[id]/journey - Update journey data (phases) for a trip
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
    const { phases, totalEmission } = body;

    // Update journey data
    const journeyData = await prisma.journey_data.upsert({
      where: {
        trip_id: id,
      },
      update: {
        phases: (phases || {}) as Prisma.InputJsonValue,
        total_emission: totalEmission || 0,
      },
      create: {
        trip_id: id,
        phases: (phases || {}) as Prisma.InputJsonValue,
        total_emission: totalEmission || 0,
      },
    });

    // Also update trip's total emission
    if (totalEmission !== undefined) {
      await prisma.trips.update({
        where: { id },
        data: { total_emission: totalEmission },
      });
    }

    return NextResponse.json({ journey: journeyData });
  } catch (error) {
    console.error("Error updating journey data:", error);
    return NextResponse.json(
      { error: "Failed to update journey data" },
      { status: 500 }
    );
  }
}
