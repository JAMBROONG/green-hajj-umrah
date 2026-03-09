import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
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
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify trip belongs to user
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        userId: token.sub as string,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Get journey data
    const journeyData = await prisma.journeyData.findUnique({
      where: {
        tripId: id,
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
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify trip belongs to user
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        userId: token.sub as string,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await request.json();
    const { phases, totalEmission } = body;

    // Update journey data
    const journeyData = await prisma.journeyData.upsert({
      where: {
        tripId: id,
      },
      update: {
        phases: (phases || {}) as Prisma.InputJsonValue,
        totalEmission: totalEmission || 0,
      },
      create: {
        tripId: id,
        phases: (phases || {}) as Prisma.InputJsonValue,
        totalEmission: totalEmission || 0,
      },
    });

    // Also update trip's total emission
    if (totalEmission !== undefined) {
      await prisma.trip.update({
        where: { id },
        data: { totalEmission },
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
