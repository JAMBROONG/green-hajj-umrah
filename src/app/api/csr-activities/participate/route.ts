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

    // Check if user already participated
    const existingParticipation = await prisma.csr_activity_participations.findUnique({
      where: {
        user_id_csr_activity_id: {
          user_id: userProfile.id,
          csr_activity_id,
        },
      },
    })

    if (existingParticipation) {
      console.log('❌ Already participated:', { user_id: userProfile.id, csr_activity_id })
      return NextResponse.json(
        { error: 'Already participated in this activity' },
        { status: 400 }
      )
    }
    console.log('✅ No existing participation record')

    // For volunteer, create immediately
    if (type === 'volunteer') {
      const participation = await prisma.csr_activity_participations.create({
        data: {
          user_id: userProfile.id,
          csr_activity_id,
          type: 'participation',
          status: 'confirmed',
        },
      })

      return NextResponse.json({
        id: participation.id,
        message: 'Registered as volunteer successfully',
        requiresPayment: false,
      })
    }

    // For donation, create Midtrans transaction
    if (type === 'donate') {
      // Get payment config for this tenant
      const paymentConfig = await prisma.TenantPaymentConfig.findUnique({
        where: { tenant_id: activity.tenant_id },
      })

      if (!paymentConfig || !paymentConfig.enabled) {
        console.log('❌ Payment config not found or disabled for tenant:', activity.tenant_id)
        return NextResponse.json(
          { error: 'Payment is not configured for this tenant' },
          { status: 400 }
        )
      }

      const roundedAmount = Math.round(amount)
      
      const transactionPayload = {
        transaction_details: {
          order_id: `CSR${Date.now()}`, // Short order ID
          gross_amount: roundedAmount,
        },
        customer_details: {
          first_name: userProfile.full_name?.split(' ')[0] || 'User',
          last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
          email: userProfile.email,
          phone: userProfile.metadata?.phone || '',
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
      }

      const transaction = await createMidtransTransaction(transactionPayload, paymentConfig)

      // Create participation record with pending status
      const participation = await prisma.csr_activity_participations.create({
        data: {
          user_id: userProfile.id,
          csr_activity_id,
          type: 'participate',
          amount: amount,
          status: 'pending',
          transaction_reference: transaction.token,
        },
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
      { error: 'Invalid participation type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Error creating participation:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to process participation', details: errorMessage },
      { status: 500 }
    )
  }
}
