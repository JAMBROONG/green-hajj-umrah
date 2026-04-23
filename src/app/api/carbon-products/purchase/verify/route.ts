import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateThankYouCertificate } from '@/lib/certificate-generator'
import * as fs from 'fs'
import * as path from 'path'

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
      include: { user: true, standard: true },
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

    // If the purchase is already processed AND the certificate was generated,
    // there is nothing to do. If it was marked completed but the cert is still
    // missing (rare race when webhook/redirect land before generation), fall
    // through so we can regenerate below.
    const alreadyCompleted =
      purchase.status === 'completed' || purchase.status === 'confirmed'
    const certAlreadyGenerated = !!purchase.thank_you_certificate_url

    if (purchase.status !== 'pending' && !(alreadyCompleted && !certAlreadyGenerated)) {
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
    const paymentMethod: string | null = statusData.payment_type ?? null

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
      let updatedPurchase = await prisma.carbon_certificate_purchases.update({
        where: { id: purchaseId },
        data: {
          status: newStatus,
          ...(paymentMethod ? { payment_method: paymentMethod } : {}),
          metadata: {
            ...(purchase.metadata as Record<string, unknown>),
            transaction_id: statusData.transaction_id,
            verified_at: new Date().toISOString(),
          },
        },
      })

      console.log(`✅ Purchase status updated to: ${newStatus}`)

      // OPTIONAL: Generate thank you certificate if payment completed
      if (newStatus === 'completed') {
        console.log('📄 Generating thank you certificate...')
        try {
          const certificatesDir = path.join(process.cwd(), 'public', 'certificates')
          
          // Create directory if not exists
          if (!fs.existsSync(certificatesDir)) {
            fs.mkdirSync(certificatesDir, { recursive: true })
            console.log('📁 Created certificates directory')
          }

          const purchaseDate = new Date(purchase.created_at).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })

          const recipientName  = purchase.user?.full_name || 'Carbon Supporter'
          const productName    = purchase.standard?.name || purchase.standard?.series || 'Carbon Certificate'
          const units          = purchase.units || 0
          const userMeta       = purchase.user?.metadata as Record<string, unknown> | null
          const avatarUrl      = (userMeta?.avatar_url as string | undefined) ?? null
          const certificateId  = purchaseId.slice(0, 8).toUpperCase()

          // Base URL for storing absolute certificate links
          const appBaseUrl = (
            process.env.NEXTAUTH_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000'
          ).replace(/\/$/, '')

          let thankYouUrl: string | null = null

          // Generate Thank You Certificate
          try {
            const thankYouBuffer = await generateThankYouCertificate({
              recipientName,
              activityTitle: productName,
              units,
              amount: parseFloat(purchase.total_price?.toString() || '0'),
              donationDate: purchaseDate,
              tenantId: purchase.user?.tenant_id ?? null,
              avatarUrl,
              certificateNumber: certificateId,
            })
            const thankYouFilename = `carbon-thankyou-${purchaseId}-${Date.now()}.jpg`
            const thankYouPath = path.join(certificatesDir, thankYouFilename)
            fs.writeFileSync(thankYouPath, thankYouBuffer)
            thankYouUrl = `${appBaseUrl}/api/certificate-file/${thankYouFilename}`
            console.log('✅ Thank you certificate generated:', thankYouUrl)
          } catch (e) {
            console.error('❌ Failed to generate thank you certificate:', e)
          }

          // Update purchase with certificate URL
          if (thankYouUrl) {
            console.log('📝 Updating purchase with certificate URL...')
            updatedPurchase = await prisma.carbon_certificate_purchases.update({
              where: { id: purchaseId },
              data: {
                thank_you_certificate_url: thankYouUrl,
                certificate_id: certificateId,
                updated_at: new Date(),
              },
            })
            console.log('✅ Purchase updated with certificate:', {
              id: updatedPurchase.id,
              thankYouUrl,
            })
          }
        } catch (e) {
          console.error('❌ Certificate generation error (non-blocking):', e)
          // Don't block payment verification if certificate generation fails
        }
      }

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
