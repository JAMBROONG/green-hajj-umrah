import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await auth()
    
    console.log('Fetching activity with ID:', resolvedParams.id)

    // Get user's tenant_id from profile for tenant-based access control
    let userTenantId: string | null = null
    if (session?.user?.email) {
      const userProfile = await prisma.profiles.findUnique({
        where: { email: session.user.email },
      })
      userTenantId = userProfile?.tenant_id || null
    }

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

    // Check tenant access: user can only view activities from their tenant
    if (userTenantId && activity.tenant_id !== userTenantId) {
      console.log('Unauthorized access attempt:', { requestedActivity: resolvedParams.id, userTenant: userTenantId, activityTenant: activity.tenant_id })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
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
