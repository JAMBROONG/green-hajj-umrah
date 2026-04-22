import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

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
    if (body.action !== 'cancel') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const purchase = await prisma.carbon_certificate_purchases.findFirst({
      where: { id, user_id: user.id },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // Only allow cancelling pending orders
    if (purchase.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be cancelled' }, { status: 409 })
    }

    await prisma.carbon_certificate_purchases.update({
      where: { id },
      data: {
        status: 'failed',
        metadata: {
          ...(purchase.metadata as Record<string, unknown>),
          cancelled_by_user: true,
          cancelled_at: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling certificate:', error)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}

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

    const cert = await prisma.carbon_certificate_purchases.findFirst({
      where: { id, user_id: user.id },
      include: { standard: true },
    })

    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const meta = cert.metadata as any
    console.log('[API /certificates/:id] cert.metadata raw:', cert.metadata)
    console.log('[API /certificates/:id] thank_you_certificate_url (direct column):', cert.thank_you_certificate_url)
    console.log('[API /certificates/:id] emission_reduction_certificate_url (direct column):', cert.emission_reduction_certificate_url)
    console.log('[API /certificates/:id] meta thank_you_certificate_url:', meta?.thank_you_certificate_url)
    console.log('[API /certificates/:id] meta emission_reduction_certificate_url:', meta?.emission_reduction_certificate_url)

    return NextResponse.json({
      id: cert.id,
      co2_equivalent: cert.co2_equivalent,
      amount: cert.total_price,
      units: cert.units,
      certificate_id: cert.id,
      status: cert.status,
      purchase_date: cert.created_at.toISOString(),
      thank_you_certificate_url: cert.thank_you_certificate_url || meta?.thank_you_certificate_url || null,
      emission_reduction_certificate_url: cert.emission_reduction_certificate_url || meta?.emission_reduction_certificate_url || null,
      standard_series: cert.standard?.series,
      standard_name: cert.standard?.name,
      standard_vintage: cert.standard?.vintage,
      transaction_reference: cert.transaction_reference || null,
    })
  } catch (error) {
    console.error('Error fetching certificate:', error)
    return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 })
  }
}
