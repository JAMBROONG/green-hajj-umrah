import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

// GET /api/csr-activities/[id]/updates — public, no auth required
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const updates = await prisma.csr_activity_updates.findMany({
      where: { csr_activity_id: id },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(updates)
  } catch (error) {
    console.error('Error fetching CSR updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    )
  }
}
