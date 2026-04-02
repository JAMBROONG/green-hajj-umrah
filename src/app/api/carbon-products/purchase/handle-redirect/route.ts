import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Handle Midtrans finish redirect
 * GET /api/carbon-products/purchase/handle-redirect?order_id=...&status_code=...&transaction_status=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id')
    const transactionStatus = searchParams.get('transaction_status')
    const statusCode = searchParams.get('status_code')

    console.log('🔄 Midtrans Redirect Received:', {
      orderId,
      transactionStatus,
      statusCode,
    })

    if (!orderId) {
      return NextResponse.redirect(new URL('/carbon-market', request.url))
    }

    // Find purchase by order_id
    const purchase = await prisma.carbon_certificate_purchases.findFirst({
      where: {
        metadata: {
          path: ['order_id'],
          equals: orderId,
        },
      },
    })

    if (!purchase) {
      console.warn('⚠️ Purchase not found for order:', orderId)
      return NextResponse.redirect(new URL('/carbon-market', request.url))
    }

    // Update status based on transaction_status
    let newStatus = 'pending'
    
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      newStatus = 'completed'
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      newStatus = 'failed'
    }

    // Update purchase if status changed to completed
    if (newStatus === 'completed' && purchase.status !== 'completed') {
      await prisma.carbon_certificate_purchases.update({
        where: { id: purchase.id },
        data: {
          status: newStatus,
          metadata: {
            ...(purchase.metadata as Record<string, unknown>),
            verified_at: new Date().toISOString(),
            transaction_status: transactionStatus,
            status_code: statusCode,
          },
        },
      })

      console.log('✅ Purchase status updated to completed:', purchase.id)
    }

    // Redirect to profile dengan purchase ID
    const redirectUrl = new URL(`/profile?tab=certificates&purchased=${purchase.id}`, request.url)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('❌ Error handling redirect:', error)
    return NextResponse.redirect(new URL('/carbon-market', request.url))
  }
}
