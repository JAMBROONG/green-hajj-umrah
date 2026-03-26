import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// API endpoint to fetch CSR activities with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const tenantId = searchParams.get('tenantId')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (tenantId) {
      where.tenant_id = tenantId
    }

    const activities = await prisma.csr_activities.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching CSR activities:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to fetch CSR activities', details: errorMessage },
      { status: 500 }
    )
  }
}
