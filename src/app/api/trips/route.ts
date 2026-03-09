import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { initializePhases } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/trips - List all trips for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await prisma.trip.findMany({
      where: {
        userId: token.sub as string,
      },
      include: {
        journeys: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

// POST /api/trips - Create a new trip
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, startDate, endDate } = body;

    if (!name || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, startDate, endDate" },
        { status: 400 }
      );
    }

    if (type !== "haji" && type !== "umrah") {
      return NextResponse.json(
        { error: "Type must be either 'haji' or 'umrah'" },
        { status: 400 }
      );
    }

    // Get user's tenantId
    const user = await prisma.profile.findUnique({
      where: { id: token.sub as string },
      select: { tenantId: true },
    });

    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: "User tenant not found" },
        { status: 400 }
      );
    }

    // Create trip and empty journey data
    const trip = await prisma.trip.create({
      data: {
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userId: token.sub as string,
        tenantId: user.tenantId,
        status: "ongoing",
        totalEmission: 0,
      },
    });

    // Create journey data with initialized phases for the trip
    const initialPhases = initializePhases();
    const journeyData = await prisma.journeyData.create({
      data: {
        tripId: trip.id,
        phases: JSON.parse(JSON.stringify(initialPhases)) as Prisma.InputJsonValue,
        totalEmission: 0,
      },
    });

    return NextResponse.json({ trip, journeyData }, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
