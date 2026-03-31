import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Midtrans Notification Handler
 * Webhook endpoint untuk menerima notifikasi pembayaran dari Midtrans
 * POST /api/carbon-products/purchase/notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📬 Midtrans Notification Received:', {
      order_id: body.order_id,
      transaction_id: body.transaction_id,
      transaction_status: body.transaction_status,
      payment_type: body.payment_type,
    })

    // Get Carbon Payment Config for signature verification
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
    
    if (!carbonConfig) {
      console.error('❌ Carbon payment config not found')
      return NextResponse.json(
        { error: 'Payment configuration error' },
        { status: 500 }
      )
    }

    // Verify Midtrans signature
    const signatureKey = `${body.order_id}${body.status_code}${body.gross_amount}${carbonConfig.midtrans_server_key}`
    const signature = crypto.createHash('sha512').update(signatureKey).digest('hex')
    
    if (signature !== body.signature_key) {
      console.error('❌ Invalid signature:', {
        expected: signature,
        received: body.signature_key,
      })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }

    console.log('✅ Signature verified')

    // Handle different transaction statuses
    const transactionStatus = body.transaction_status

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      // Payment successful
      console.log('💰 Payment successful, updating purchase status...')
      
      // Find purchase by transaction reference (snap token is stored in metadata)
      const purchase = await prisma.carbon_certificate_purchases.findFirst({
        where: {
          metadata: {
            path: ['order_id'],
            equals: body.order_id,
          },
        },
      })

      if (purchase) {
        // Update purchase status to completed
        await prisma.carbon_certificate_purchases.update({
          where: { id: purchase.id },
          data: {
            status: 'completed',
            metadata: {
              ...(purchase.metadata as Record<string, unknown>),
              transaction_id: body.transaction_id,
              payment_type: body.payment_type,
              settlement_time: body.settlement_time,
              gross_amount: body.gross_amount,
            },
          },
        })

        console.log('✅ Purchase status updated to completed:', purchase.id)
      } else {
        console.warn('⚠️ Purchase not found for order:', body.order_id)
      }
    } else if (transactionStatus === 'pending') {
      console.log('⏳ Payment pending, awaiting customer action')
    } else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire'
    ) {
      // Payment failed or cancelled
      console.log('❌ Payment failed/cancelled, updating purchase status...')
      
      const purchase = await prisma.carbon_certificate_purchases.findFirst({
        where: {
          metadata: {
            path: ['order_id'],
            equals: body.order_id,
          },
        },
      })

      if (purchase) {
        await prisma.carbon_certificate_purchases.update({
          where: { id: purchase.id },
          data: {
            status: 'failed',
            metadata: {
              ...(purchase.metadata as Record<string, unknown>),
              transaction_id: body.transaction_id,
              failure_reason: transactionStatus,
            },
          },
        })

        console.log('✅ Purchase status updated to failed:', purchase.id)
      }
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('❌ Error processing notification:', error)
    // Still return 200 to avoid Midtrans retry
    return NextResponse.json(
      { status: 'success', error: 'Processing error logged' },
      { status: 200 }
    )
  }
}
