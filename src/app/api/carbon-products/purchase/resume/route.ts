import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Helper to create Midtrans transaction via HTTP
async function createMidtransTransaction(
  payload: Record<string, unknown>,
  serverKey: string,
  isProduction: boolean
) {
  const apiUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const basicAuth = Buffer.from(`${serverKey}:`).toString('base64')

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  type MidtransResponse = {
    token?: string
    redirect_url?: string
    error_messages?: string[]
  }
  const data = (await response.json()) as MidtransResponse

  if (!response.ok) {
    throw new Error(
      `Midtrans API error (${response.status}): ${data.error_messages?.join(', ') || response.statusText}`
    )
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      console.error('❌ [Resume Carbon] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId } = body

    console.log('🔍 [Resume Carbon] Called with:', { purchaseId, userEmail: session.user.email })

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID required' },
        { status: 400 }
      )
    }

    // Get user profile dulu — kita perlu user_id untuk filter ownership
    // pada query purchase di bawah (mencegah IDOR resume purchase milik
    // user lain).
    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email! },
    })

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Cari purchase HARUS milik user yang sedang login (filter user_id).
    const purchase = await prisma.carbon_certificate_purchases.findFirst({
      where: { id: purchaseId, user_id: userProfile.id },
      include: { standard: true },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Only allow status pending or failed
    if (!['pending', 'failed'].includes(purchase.status)) {
      return NextResponse.json({
        status: purchase.status,
        message: 'Purchase already processed',
      })
    }

    // Get Carbon Payment Config
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    if (!carbonConfig || !carbonConfig.enabled) {
      return NextResponse.json(
        { error: 'Carbon payment configuration not available' },
        { status: 500 }
      )
    }

    // Calculate unit price
    const totalPrice = Number(purchase.total_price)
    const units = purchase.units || 1
    const unitPrice = Math.round(totalPrice / units)

    // Create new transaction payload
    // Use shorter order_id format (Midtrans has length limits)
    const orderId = `CR${Date.now()}${Math.random().toString(36).substr(2, 5)}`
    const transactionPayload: Record<string, unknown> = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice,
      },
      customer_details: {
        first_name: userProfile.full_name?.split(' ')[0] || 'User',
        last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email,
        phone: typeof userProfile.metadata === 'object' && userProfile.metadata !== null && 'phone' in userProfile.metadata
          ? String(userProfile.metadata.phone) 
          : '',
      },
      item_details: [
        {
          id: purchase.standard_id,
          price: unitPrice,
          quantity: units,
          name: `${purchase.standard?.series || 'Carbon Credits'} (${purchase.units} tCO2e)`,
          category: 'Carbon Credits',
        },
      ],
      custom_field1: `purchase:${purchaseId}`,
      custom_field2: `user:${userProfile.id}`,
      finish_redirect_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/profile?tab=certificates`,
    }

    // Create new transaction
    const transaction = await createMidtransTransaction(
      transactionPayload,
      carbonConfig.midtrans_server_key,
      carbonConfig.is_production
    )

    // Update purchase record with new transaction reference
    const currentMetadata = typeof purchase.metadata === 'object' && purchase.metadata !== null
      ? purchase.metadata as Record<string, unknown>
      : {}

    const updatedPurchase = await prisma.carbon_certificate_purchases.update({
      where: { id: purchaseId },
      data: {
        transaction_reference: transaction.token || '',
        status: 'pending', // Reset to pending for new payment attempt
        metadata: {
          ...currentMetadata,
          snap_url: transaction.redirect_url,
          order_id: orderId,
          resumed_at: new Date().toISOString(),
        },
      },
    })

    console.log('✅ [Resume Carbon] Purchase resumed:', {
      id: updatedPurchase.id,
      snapToken: transaction.token,
    })

    return NextResponse.json({
      id: updatedPurchase.id,
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
      message: 'Payment resumed successfully',
    })
  } catch (error) {
    console.error('❌ [Resume Carbon] Error:', error)
    return NextResponse.json(
      { error: 'Failed to resume payment' },
      { status: 500 }
    )
  }
}
