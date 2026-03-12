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

    const trips = await prisma.trips.findMany({
      where: {
        user_id: token.sub as string,
      },
      include: {
        journeys: true,
      },
      orderBy: {
        start_date: "desc",
      },
    });

    // Transform snake_case to camelCase for frontend
    const transformedTrips = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      type: trip.type,
      startDate: trip.start_date,
      endDate: trip.end_date,
      totalEmission: trip.total_emission,
      status: trip.status,
      createdAt: trip.created_at,
      userId: trip.user_id,
      tenantId: trip.tenant_id,
      journeys: trip.journeys
    }));

    return NextResponse.json({ trips: transformedTrips });
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
    const user = await prisma.profiles.findUnique({
      where: { id: token.sub as string },
      select: { tenant_id: true },
    });

    if (!user || !user.tenant_id) {
      return NextResponse.json(
        { error: "User tenant not found" },
        { status: 400 }
      );
    }

    // Create trip and empty journey data
    const trip = await prisma.trips.create({
      data: {
        name,
        type,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        user_id: token.sub as string,
        tenant_id: user.tenant_id,
        status: "ongoing",
        total_emission: 0,
      },
    });

    // Create journey data with initialized phases for the trip
    const initialPhases = initializePhases();
    const journeyData = await prisma.journey_data.create({
      data: {
        trip_id: trip.id,
        phases: JSON.parse(JSON.stringify(initialPhases)) as Prisma.InputJsonValue,
        total_emission: 0,
      },
    });

    // Transform response to camelCase
    const transformedTrip = {
      id: trip.id,
      name: trip.name,
      type: trip.type,
      startDate: trip.start_date,
      endDate: trip.end_date,
      totalEmission: trip.total_emission,
      status: trip.status,
      createdAt: trip.created_at,
      userId: trip.user_id,
      tenantId: trip.tenant_id
    };

    const transformedJourneyData = {
      id: journeyData.id,
      tripId: journeyData.trip_id,
      phases: journeyData.phases,
      totalEmission: journeyData.total_emission,
      createdAt: journeyData.created_at
    };

    return NextResponse.json({ trip: transformedTrip, journeyData: transformedJourneyData }, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
