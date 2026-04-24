import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

async function createMidtransTransaction(payload: unknown, paymentConfig: { midtrans_server_key: string; is_production: boolean }) {
  const serverKey = paymentConfig.midtrans_server_key
  const apiUrl = paymentConfig.is_production
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const authHeader = Buffer.from(`${serverKey}:`).toString('base64')

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      `Midtrans API error (${response.status}): ${data.error_messages?.join(', ') || response.statusText}`
    )
  }
  return data
}

/**
 * POST /api/csr-activities/participate/renew-token
 * Creates a fresh Midtrans Snap token for an existing pending CSR donation.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { participationId } = body

    if (!participationId) {
      return NextResponse.json({ error: 'Missing participationId' }, { status: 400 })
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the pending participation belonging to this user
    const participation = await prisma.csr_activity_participations.findFirst({
      where: { id: participationId, user_id: userProfile.id },
      include: {
        csr_activity: { include: { tenant: true } },
      },
    })

    if (!participation) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 })
    }

    if (participation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending donations can be renewed' },
        { status: 409 }
      )
    }

    const activity = participation.csr_activity
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Get payment config — try tenant-specific first, fall back to global
    let paymentConfig: { midtrans_server_key: string; is_production: boolean } | null = null

    const tenantConfig = await prisma.tenantPaymentConfig.findUnique({
      where: { tenant_id: activity.tenant_id },
    })

    if (tenantConfig?.enabled && tenantConfig.midtrans_server_key) {
      paymentConfig = {
        midtrans_server_key: tenantConfig.midtrans_server_key,
        is_production: tenantConfig.is_production ?? false,
      }
    } else {
      const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
      if (carbonConfig?.midtrans_server_key) {
        paymentConfig = {
          midtrans_server_key: carbonConfig.midtrans_server_key,
          is_production: carbonConfig.is_production ?? false,
        }
      }
    }

    if (!paymentConfig) {
      return NextResponse.json({ error: 'Payment config not found' }, { status: 500 })
    }

    const amount = Math.round(parseFloat(participation.amount?.toString() || '0'))
    const newOrderId = `CSR${Date.now()}`

    const appBaseUrl = (
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.nextUrl.origin
    ).replace(/\/$/, '')

    const transactionPayload = {
      transaction_details: {
        order_id: newOrderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: userProfile.full_name?.split(' ')[0] || 'User',
        last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email,
        phone: (userProfile.metadata as Record<string, unknown>)?.phone || '',
      },
      item_details: [
        {
          id: activity.id,
          price: amount,
          quantity: 1,
          name: 'CSR Donation',
          category: 'Donation',
        },
      ],
      custom_field1: `csr_activity:${activity.id}`,
      custom_field2: `user:${userProfile.id}`,
      callbacks: {
        finish: `${appBaseUrl}/csr-donations/${participationId}`,
      },
    }

    const transaction = await createMidtransTransaction(transactionPayload, paymentConfig)

    // Update participation with new token
    await prisma.csr_activity_participations.update({
      where: { id: participationId },
      data: {
        transaction_reference: transaction.token,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
    })
  } catch (error) {
    console.error('Error renewing CSR snap token:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to renew token', details: message }, { status: 500 })
  }
}
