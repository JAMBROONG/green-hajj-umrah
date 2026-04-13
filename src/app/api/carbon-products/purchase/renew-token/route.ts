import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/carbon-products/purchase/renew-token
 * Creates a fresh Midtrans Snap token for an existing pending purchase.
 * Snap tokens expire ~24 hours after creation, so we need this when the
 * user returns to pay later (e.g. from the certificate detail page).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId } = body

    if (!purchaseId) {
      return NextResponse.json({ error: 'Missing purchaseId' }, { status: 400 })
    }

    // Get user profile
    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the purchase (must belong to this user and be pending)
    const purchase = await prisma.carbon_certificate_purchases.findFirst({
      where: { id: purchaseId, user_id: userProfile.id },
      include: { product: true },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (purchase.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending purchases can be renewed' },
        { status: 409 }
      )
    }

    // Get Carbon Payment Config
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
    if (!carbonConfig) {
      return NextResponse.json({ error: 'Payment config not found' }, { status: 500 })
    }

    const product = purchase.product
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const unitPrice = parseFloat(product.price.toString())
    const totalAmount = Math.round(unitPrice * (purchase.units ?? 1))

    // New order_id — must be unique in Midtrans
    const newOrderId = `CARBON${Date.now()}`

    const transactionPayload = {
      transaction_details: {
        order_id: newOrderId,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: userProfile.full_name?.split(' ')[0] || 'User',
        last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email,
        phone: (userProfile.metadata as Record<string, unknown>)?.phone || '',
      },
      item_details: [
        {
          id: product.id,
          price: unitPrice,
          quantity: purchase.units,
          name: `${product.name} (${purchase.units} tCO2e)`,
          category: 'Carbon Credits',
        },
      ],
      custom_field1: `product:${product.product_code}`,
      custom_field2: `user:${userProfile.id}`,
      finish_redirect_url: `${
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        'http://localhost:3000'
      }/api/carbon-products/purchase/handle-redirect`,
    }

    const apiUrl = carbonConfig.is_production
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const authHeader = Buffer.from(`${carbonConfig.midtrans_server_key}:`).toString('base64')

    const midtransRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(transactionPayload),
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      throw new Error(
        `Midtrans error (${midtransRes.status}): ${
          midtransData.error_messages?.join(', ') || midtransRes.statusText
        }`
      )
    }

    // Update the purchase with the new token and new order_id
    const existingMeta = (purchase.metadata as Record<string, unknown>) || {}
    await prisma.carbon_certificate_purchases.update({
      where: { id: purchaseId },
      data: {
        transaction_reference: midtransData.token,
        metadata: {
          ...existingMeta,
          order_id: newOrderId,
          snap_url: midtransData.redirect_url,
          renewed_at: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      snapToken: midtransData.token,
      snapUrl: midtransData.redirect_url,
    })
  } catch (error) {
    console.error('❌ Error renewing snap token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to renew token' },
      { status: 500 }
    )
  }
}
