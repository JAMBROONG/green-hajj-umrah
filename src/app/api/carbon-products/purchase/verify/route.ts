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

    // Get order_id from metadata first
    const metadata = purchase?.metadata as Record<string, unknown> | undefined

    console.log('📦 Purchase Record:', {
      found: !!purchase,
      id: purchase?.id,
      status: purchase?.status,
      userId: purchase?.user_id,
      orderId: metadata?.order_id,
      snapUrl: metadata?.snap_url ? 'exists' : 'missing',
      metadataKeys: Object.keys(metadata || {}),
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

    const orderId = metadata?.order_id as string

    console.log('🔍 Extracted order ID from metadata:', orderId)

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID not found in purchase' },
        { status: 400 }
      )
    }

    // Call Midtrans status API
    const apiUrl = carbonConfig.is_production
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`

    const authHeader = Buffer.from(`${carbonConfig.midtrans_server_key}:`).toString('base64')

    console.log('🔍 Checking payment status for order:', orderId)
    console.log('📡 API URL:', apiUrl)

    const statusResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
      },
    })

    const statusData = await statusResponse.json()

    if (!statusResponse.ok) {
      console.error('❌ Midtrans API error:', statusResponse.status, statusResponse.statusText)
      console.error('❌ Response body:', JSON.stringify(statusData, null, 2))
      
      // If order not found at Midtrans, that's a problem
      if (statusResponse.status === 404) {
        console.error('❌ Order ID not found at Midtrans! Order:', orderId)
        console.error('❌ This means the order was never created at Midtrans, or the order_id format is wrong')
        return NextResponse.json(
          { error: 'Order not found at payment gateway' },
          { status: 404 }
        )
      }
      
      // For other errors, still try to parse response
      if (statusData.error_messages) {
        console.error('❌ Midtrans error messages:', statusData.error_messages)
      }
    }

    console.log('✅ Midtrans status response (FULL):', JSON.stringify(statusData, null, 2))
    console.log('✅ Midtrans status response (PARSED):', {
      order_id: statusData.order_id,
      transaction_id: statusData.transaction_id,
      transaction_status: statusData.transaction_status,
      transaction_time: statusData.transaction_time,
      status_code: statusData.status_code,
      payment_type: statusData.payment_type,
      fraud_status: statusData.fraud_status,
      gross_amount: statusData.gross_amount,
      error: statusData.error_messages,
    })

    // Update purchase status based on transaction status
    let newStatus = 'pending'

    if (statusData.transaction_status === 'capture' || statusData.transaction_status === 'settlement') {
      newStatus = 'completed'
    } else if (statusData.transaction_status === 'deny' || statusData.transaction_status === 'cancel' || statusData.transaction_status === 'expire') {
      newStatus = 'failed'
    } else {
      console.log('⏳ Payment still pending at Midtrans:', statusData.transaction_status)
    }

    console.log('📋 Status determination:', {
      midtransStatus: statusData.transaction_status,
      newStatus,
      fraudStatus: statusData.fraud_status,
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
      message: 'Payment still pending at Midtrans',
      midtransStatus: statusData.transaction_status,
      orderDetails: {
        orderId: orderId,
        transactionId: statusData.transaction_id,
        fraudStatus: statusData.fraud_status,
      },
      diagnostic: {
        note: 'User belum menyelesaikan pembayaran di Midtrans Snap, atau menunggu confirmasi dari bank',
        transactionTime: statusData.transaction_time,
      },
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
