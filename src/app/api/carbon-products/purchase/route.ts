import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Helper to create Midtrans transaction via HTTP
async function createMidtransTransaction(payload: any, serverKey: string, isProduction: boolean) {
  const apiUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const auth = Buffer.from(`${serverKey}:`).toString('base64')

  console.log('🔑 Midtrans Auth:', { serverKeyLength: serverKey?.length, apiUrl })
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
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    if (!carbonConfig) {
      return NextResponse.json({ error: 'Carbon payment configuration not found' }, { status: 500 })
    }

    if (!carbonConfig.enabled) {
      return NextResponse.json({ error: 'Carbon payment is currently disabled' }, { status: 503 })
    }

    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email! },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const body = await request.json()
    console.log('📥 Request body:', body)

    const { standard_series, units } = body

    if (!standard_series || typeof standard_series !== 'string') {
      return NextResponse.json({ error: 'standard_series tidak valid.' }, { status: 400 })
    }

    const unitsNum = Number(units)
    if (!Number.isInteger(unitsNum) || unitsNum < 1 || unitsNum > 100) {
      return NextResponse.json(
        { error: 'Jumlah unit harus berupa bilangan bulat antara 1 dan 100.' },
        { status: 400 }
      )
    }

    const standard = await prisma.carbon_product_standards.findUnique({
      where: { series: standard_series },
    })

    if (!standard) {
      console.log('❌ Standard not found:', standard_series)
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 })
    }

    if (!standard.is_active) {
      return NextResponse.json({ error: 'Standard is not available' }, { status: 400 })
    }

    // Scope service_setting to the user's tenant (fallback to 0% if not set)
    const serviceSetting = userProfile.tenant_id
      ? await prisma.service_setting.findUnique({ where: { tenant_id: userProfile.tenant_id } })
      : null
    const adminFeeRate = serviceSetting?.idx_admin_fee
      ? parseFloat(serviceSetting.idx_admin_fee.toString()) / 100
      : 0
    const PPN_RATE = 0.11

    const unitPrice = parseFloat(standard.price.toString())
    const subtotal = unitPrice * unitsNum
    const adminFee = subtotal * adminFeeRate
    const ppn = (subtotal + adminFee) * PPN_RATE
    const totalAmount = Math.round(subtotal + adminFee + ppn)

    const MAX_TRANSACTION_IDR = 50_000_000
    if (totalAmount > MAX_TRANSACTION_IDR) {
      return NextResponse.json(
        { error: 'Total transaksi melebihi batas maksimum yang diizinkan.' },
        { status: 400 }
      )
    }

    const transactionPayload = {
      transaction_details: {
        order_id: `CARBON${Date.now()}`,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: userProfile.full_name?.split(' ')[0] || 'User',
        last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email,
        phone: (userProfile.metadata as Record<string, string>)?.phone || '',
      },
      item_details: [
        {
          id: standard.id,
          price: Math.round(totalAmount / unitsNum),
          quantity: unitsNum,
          name: `${standard.series} - ${unitsNum} tCO2e`,
          category: 'Carbon Credits',
        },
      ],
      custom_field1: `standard:${standard_series}`,
      custom_field2: `user:${userProfile.id}`,
      finish_redirect_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/carbon-products/purchase/handle-redirect`,
    }

    const transaction = await createMidtransTransaction(transactionPayload, carbonConfig.midtrans_server_key, carbonConfig.is_production)

    const purchase = await prisma.carbon_certificate_purchases.create({
      data: {
        user_id: userProfile.id,
        standard_id: standard.id,
        units: unitsNum,
        co2_equivalent: unitsNum,
        amount: totalAmount,
        total_price: totalAmount,
        transaction_reference: transaction.token,
        status: 'pending',
        metadata: {
          snap_url: transaction.redirect_url,
          order_id: transactionPayload.transaction_details.order_id,
          breakdown: {
            subtotal: Math.round(subtotal),
            admin_fee: Math.round(adminFee),
            admin_fee_pct: Number((adminFeeRate * 100).toFixed(2)),
            ppn: Math.round(ppn),
            ppn_pct: 11,
          },
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
      { error: error instanceof Error ? error.message : 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
