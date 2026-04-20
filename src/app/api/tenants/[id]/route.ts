import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id },
      select: { phone: true, name: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error: any) {
    console.error("Error fetching tenant by id:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant", detail: error.message },
      { status: 500 }
    );
  }
}
