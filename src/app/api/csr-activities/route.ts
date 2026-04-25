import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// API endpoint to fetch CSR activities with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // Get user's tenant_id from profile
    let userTenantId: string | null = null
    
    if (session?.user?.email) {
      const userProfile = await prisma.profiles.findUnique({
        where: { email: session.user.email },
      })
      userTenantId = userProfile?.tenant_id || null
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    // Filter by user's tenant_id
    if (userTenantId) {
      where.tenant_id = userTenantId
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

    console.log('✅ CSR activities fetched successfully:', activities.length)
    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching CSR activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CSR activities' },
      { status: 500 }
    )
  }
}
