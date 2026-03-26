import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
    console.log('Fetching activity with ID:', resolvedParams.id)

    const activity = await prisma.csr_activities.findUnique({
      where: { id: resolvedParams.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (!activity) {
      console.log('Activity not found for ID:', resolvedParams.id)
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error fetching CSR activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
