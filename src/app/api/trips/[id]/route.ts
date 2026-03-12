import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/trips/[id] - Get a single trip
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

    const trip = await prisma.trips.findFirst({
      where: {
        id,
        user_id: token.sub as string,
      },
      include: {
        journeys: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Transform to camelCase
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
      tenantId: trip.tenant_id,
      journeys: trip.journeys
    };

    return NextResponse.json({ trip: transformedTrip });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

// PUT /api/trips/[id] - Update a trip
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

    const body = await request.json();
    const { name, type, startDate, endDate, status } = body;

    // Verify trip belongs to user
    const existingTrip = await prisma.trips.findFirst({
      where: {
        id,
        user_id: token.sub as string,
      },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Build update data
    const updateData: {
      name?: string;
      type?: string;
      start_date?: Date;
      end_date?: Date;
      status?: string;
    } = {};
    if (name) updateData.name = name;
    if (type) {
      if (type !== "haji" && type !== "umrah") {
        return NextResponse.json(
          { error: "Type must be either 'haji' or 'umrah'" },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (startDate) updateData.start_date = new Date(startDate);
    if (endDate) updateData.end_date = new Date(endDate);
    if (status) {
      if (!["ongoing", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          { error: "Status must be one of: ongoing, completed, cancelled" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    const trip = await prisma.trips.update({
      where: { id },
      data: updateData,
      include: {
        journeys: true,
      },
    });

    // Transform to camelCase
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
      tenantId: trip.tenant_id,
      journeys: trip.journeys
    };

    return NextResponse.json({ trip: transformedTrip });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[id] - Delete a trip
export async function DELETE(
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
    const existingTrip = await prisma.trips.findFirst({
      where: {
        id,
        user_id: token.sub as string,
      },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Delete trip (cascade will delete journey data)
    await prisma.trips.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}
