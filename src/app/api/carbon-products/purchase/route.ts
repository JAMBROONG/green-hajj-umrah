import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Helper to create Midtrans transaction via HTTP
async function createMidtransTransaction(payload: any) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  
  // Midtrans API endpoint
  const apiUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  // Create Basic Auth header
  const auth = Buffer.from(`${serverKey}:`).toString('base64')

  console.log('🔑 Midtrans Auth:', {
    serverKeyLength: serverKey?.length,
    apiUrl,
  })

  console.log('📤 Carbon Product Purchase Payload:', JSON.stringify(payload, null, 2))

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
    
    const { product_code, units } = body

    // Validate input
    if (!product_code || !units || units < 1) {
      console.log('❌ Validation failed:', { product_code, units })
      return NextResponse.json(
        { error: 'Missing required fields: product_code and units (min 1)' },
        { status: 400 }
      )
    }

    // Get product from database
    const product = await prisma.carbon_products.findUnique({
      where: { product_code },
    })

    if (!product) {
      console.log('❌ Product not found:', product_code)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (!product.is_active) {
      console.log('❌ Product is not active:', product_code)
      return NextResponse.json(
        { error: 'Product is not available' },
        { status: 400 }
      )
    }

    console.log('✅ Product found:', product.name)

    // Calculate total price
    const unitPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price
    const totalAmount = Math.round(unitPrice * units)

    const transactionPayload = {
      transaction_details: {
        order_id: `CARBON${Date.now()}`,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: userProfile.full_name?.split(' ')[0] || 'User',
        last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email,
        phone: userProfile.metadata?.phone || '',
      },
      item_details: [
        {
          id: product.id,
          price: unitPrice,
          quantity: units,
          name: `${product.name} (${units} tCO2e)`,
          category: 'Carbon Credits',
        },
      ],
      custom_field1: `product:${product_code}`,
      custom_field2: `user:${userProfile.id}`,
    }

    const transaction = await createMidtransTransaction(transactionPayload)

    // Create certificate purchase record with pending status
    const purchase = await prisma.carbon_certificate_purchases.create({
      data: {
        user_id: userProfile.id,
        product_id: product.id,
        units: units,
        total_price: totalAmount,
        transaction_reference: transaction.token,
        status: 'pending',
        metadata: {
          snap_url: transaction.redirect_url,
          order_id: transactionPayload.transaction_details.order_id,
        },
      },
    })

    console.log('✅ Purchase record created:', purchase.id)

    return NextResponse.json({
      id: purchase.id,
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
      message: 'Transaction created, please complete payment',
    })
  } catch (error) {
    console.error('❌ Error in carbon purchase:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process purchase' 
      },
      { status: 500 }
    )
  }
}
