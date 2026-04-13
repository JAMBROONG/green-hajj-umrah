import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const donation = await prisma.csr_activity_participations.findFirst({
      where: { id, user_id: user.id },
      include: {
        csr_activity: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            location: true,
            image_url: true,
            activity_date: true,
          },
        },
      },
    })

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: donation.id,
      csr_activity_id: donation.csr_activity_id,
      type: donation.type,
      amount: parseFloat(donation.amount?.toString() || '0'),
      status: donation.status,
      created_at: donation.created_at,
      activity_title: donation.csr_activity?.title || 'Unknown Activity',
      activity_description: donation.csr_activity?.description || '',
      activity_category: donation.csr_activity?.category || '',
      activity_location: donation.csr_activity?.location || '',
      activity_image_url: donation.csr_activity?.image_url || null,
      activity_date: donation.csr_activity?.activity_date || null,
      thank_you_certificate_url: donation.thank_you_certificate_url,
      participation_certificate_url: donation.participation_certificate_url,
      snap_token: donation.status === 'pending' ? donation.transaction_reference : null,
    })
  } catch (error) {
    console.error('Error fetching CSR donation:', error)
    return NextResponse.json({ error: 'Failed to fetch donation' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const donation = await prisma.csr_activity_participations.findFirst({
      where: { id, user_id: user.id },
    })

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    if (donation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending donations can be cancelled' },
        { status: 409 }
      )
    }

    await prisma.csr_activity_participations.update({
      where: { id },
      data: {
        status: 'cancelled',
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ success: true, status: 'cancelled' })
  } catch (error) {
    console.error('Error cancelling CSR donation:', error)
    return NextResponse.json({ error: 'Failed to cancel donation' }, { status: 500 })
  }
}

