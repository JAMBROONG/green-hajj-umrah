import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * Verify payment status and update purchase if successful
 * POST /api/carbon-products/purchase/verify
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      console.error('❌ Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId } = body

    console.log('🔍 Verify Endpoint Called:', { purchaseId, userEmail: session.user.email })

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID required' },
        { status: 400 }
      )
    }

    // Get purchase record
    const purchase = await prisma.carbon_certificate_purchases.findUnique({
      where: { id: purchaseId },
      include: { user: true },
    })

    console.log('📦 Purchase Record:', {
      found: !!purchase,
      status: purchase?.status,
      userId: purchase?.user_id,
      metadata: purchase?.metadata,
    })

    if (!purchase) {
      console.error('❌ Purchase not found:', purchaseId)
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Only verify if still pending
    if (purchase.status !== 'pending') {
      console.log('ℹ️ Purchase already processed:', purchase.status)
      return NextResponse.json({
        status: purchase.status,
        message: 'Purchase already processed',
      })
    }

    // Get Carbon Payment Config
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    if (!carbonConfig) {
      console.error('❌ Carbon payment config not found')
      return NextResponse.json(
        { error: 'Payment configuration not found' },
        { status: 500 }
      )
    }

    // Get order_id from metadata
    const metadata = purchase.metadata as Record<string, unknown>
    const orderId = metadata?.order_id as string

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID not found in purchase' },
        { status: 400 }
      )
    }

    // Call Midtrans status API
    const apiUrl = carbonConfig.is_production
      ? `https://app.midtrans.com/snap/v1/transactions/${orderId}/status`
      : `https://app.sandbox.midtrans.com/snap/v1/transactions/${orderId}/status`

    const auth = Buffer.from(`${carbonConfig.midtrans_server_key}:`).toString('base64')

    console.log('🔍 Checking payment status for order:', orderId)
    console.log('📡 API URL:', apiUrl)

    const statusResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!statusResponse.ok) {
      console.error('❌ Midtrans API error:', statusResponse.status, statusResponse.statusText)
    }

    const statusData = await statusResponse.json()

    console.log('✅ Midtrans status response:', {
      order_id: statusData.order_id,
      transaction_status: statusData.transaction_status,
      status_code: statusData.status_code,
      error: statusData.error_messages,
    })

    // Update purchase status based on transaction status
    let newStatus = 'pending'

    if (statusData.transaction_status === 'capture' || statusData.transaction_status === 'settlement') {
      newStatus = 'completed'
    } else if (statusData.transaction_status === 'deny' || statusData.transaction_status === 'cancel' || statusData.transaction_status === 'expire') {
      newStatus = 'failed'
    }

    console.log('📋 Status determination:', {
      transactionStatus: statusData.transaction_status,
      newStatus,
    })

    // Update purchase if status changed
    if (newStatus !== 'pending') {
      console.log('🔄 Updating purchase status...')
      const updatedPurchase = await prisma.carbon_certificate_purchases.update({
        where: { id: purchaseId },
        data: {
          status: newStatus,
          metadata: {
            ...(purchase.metadata as Record<string, unknown>),
            transaction_id: statusData.transaction_id,
            verified_at: new Date().toISOString(),
          },
        },
      })

      console.log(`✅ Purchase status updated to: ${newStatus}`)

      return NextResponse.json({
        status: newStatus,
        purchase: updatedPurchase,
        message: newStatus === 'completed' ? 'Payment verified successfully!' : 'Payment failed',
      })
    }

    return NextResponse.json({
      status: 'pending',
      message: 'Payment still pending',
    })
  } catch (error) {
    console.error('❌ Error verifying payment:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      },
      { status: 500 }
    )
  }
}
