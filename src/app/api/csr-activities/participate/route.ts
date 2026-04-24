import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Helper to create Midtrans transaction via HTTP
async function createMidtransTransaction(payload: any, paymentConfig: any) {
  const serverKey = paymentConfig.midtrans_server_key
  const isProduction = paymentConfig.is_production
  
  // Midtrans API endpoint
  const apiUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  // Create Basic Auth header
  const auth = Buffer.from(`${serverKey}:`).toString('base64')

  console.log('🔑 Midtrans Auth:', {
    serverKeyLength: serverKey?.length,
    serverKeyStart: serverKey?.substring(0, 15) + '...',
    authBase64: auth.substring(0, 30) + '...',
    apiUrl,
  })

  console.log('📤 Payload:', JSON.stringify(payload, null, 2))

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  
  console.log('✅ Midtrans Response:', {
    status: response.status,
    token: data.token ? data.token.substring(0, 20) + '...' : 'MISSING',
    error: data.error_messages,
  })

  if (!response.ok) {
    console.error('❌ Full Midtrans Error:', JSON.stringify(data, null, 2))
    throw new Error(
      `Midtrans API error (${response.status}): ${data.error_messages?.join(', ') || response.statusText}`
    )
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email! },
    })

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    console.log('📥 Request body:', body)
    
    const { csr_activity_id, type, amount } = body

    // Validate input
    if (!csr_activity_id || !type) {
      console.log('❌ Validation failed: missing csr_activity_id or type', { csr_activity_id, type })
      return NextResponse.json(
        { error: 'Missing required fields: csr_activity_id and type' },
        { status: 400 }
      )
    }

    if (type === 'donate' && !amount) {
      console.log('❌ Validation failed: donate without amount', { type, amount })
      return NextResponse.json(
        { error: 'Amount required for donation' },
        { status: 400 }
      )
    }

    // Check if activity exists
    const activity = await prisma.csr_activities.findUnique({
      where: { id: csr_activity_id },
      include: { tenant: true },
    })

    if (!activity) {
      console.log('❌ Activity not found:', csr_activity_id)
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }
    console.log('✅ Activity found:', activity.title)

    // For donations: clean up any pending records to allow retry (but keep confirmed ones)
    if (type === 'donate') {
      await prisma.csr_activity_participations.deleteMany({
        where: {
          user_id: userProfile.id,
          csr_activity_id,
          status: 'pending',
        },
      })
      console.log('✅ Cleaned up pending donation records for retry')
    }

    // Volunteer registration is no longer supported - only donations
    if (type === 'volunteer') {
      return NextResponse.json(
        { error: 'Volunteer registration is no longer available. Please make a donation instead.' },
        { status: 400 }
      )
    }

    // For donation, create Midtrans transaction
    if (type === 'donate') {
      // Get payment config for this tenant
      // Try tenant-specific payment config first, fall back to global carbon config
      let paymentConfig: {
        midtrans_server_key: string
        is_production: boolean
        enabled?: boolean | null
      } | null = await prisma.tenantPaymentConfig.findUnique({
        where: { tenant_id: activity.tenant_id },
      })

      if (!paymentConfig || !paymentConfig.enabled) {
        console.log('⚠️ Tenant payment config not found/disabled, trying global carbonPaymentConfig...')
        const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
        if (carbonConfig && carbonConfig.midtrans_server_key) {
          paymentConfig = {
            midtrans_server_key: carbonConfig.midtrans_server_key,
            is_production: carbonConfig.is_production ?? false,
            enabled: true,
          }
          console.log('✅ Using global carbonPaymentConfig as fallback')
        }
      }

      if (!paymentConfig || !paymentConfig.enabled) {
        console.log('❌ Payment config not found or disabled for tenant:', activity.tenant_id)
        return NextResponse.json(
          { error: 'Payment is not configured for this tenant' },
          { status: 400 }
        )
      }

      const roundedAmount = Math.round(amount)

      // Create participation FIRST so we have the ID for the finish_url
      const participation = await prisma.csr_activity_participations.create({
        data: {
          user_id: userProfile.id,
          csr_activity_id,
          type: 'donate',
          amount: amount,
          status: 'pending',
          transaction_reference: '',
        },
      })

      const appBaseUrl = (
        process.env.AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.nextUrl.origin
      ).replace(/\/$/, '')

      const transactionPayload = {
        transaction_details: {
          order_id: `CSR${Date.now()}`, // Short order ID
          gross_amount: roundedAmount,
        },
        customer_details: {
          first_name: userProfile.full_name?.split(' ')[0] || 'User',
          last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
          email: userProfile.email,
          phone: (userProfile.metadata as Record<string, string>)?.phone || '',
        },
        item_details: [
          {
            id: csr_activity_id,
            price: roundedAmount,
            quantity: 1,
            name: 'CSR Donation', // Short name instead of activity title
            category: 'Donation',
          },
        ],
        custom_field1: `csr_activity:${csr_activity_id}`,
        custom_field2: `user:${userProfile.id}`,
        callbacks: {
          finish: `${appBaseUrl}/csr-donations/${participation.id}`,
        },
      }

      const transaction = await createMidtransTransaction(transactionPayload, paymentConfig)

      // Update participation with the snap token
      await prisma.csr_activity_participations.update({
        where: { id: participation.id },
        data: { transaction_reference: transaction.token },
      })

      return NextResponse.json({
        id: participation.id,
        message: 'Donation transaction created',
        requiresPayment: true,
        snapToken: transaction.token,
        snapUrl: transaction.redirect_url,
        transactionId: transaction.transaction_id,
      })
    }

    return NextResponse.json(
      { error: 'Invalid donation type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Error processing donation:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to process donation', details: errorMessage },
      { status: 500 }
    )
  }
}
