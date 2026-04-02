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

    console.log('🔄 Midtrans Redirect Received:', { orderId })

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

    // Get Carbon Payment Config
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    if (!carbonConfig) {
      console.error('❌ Carbon payment config not found')
      return NextResponse.redirect(new URL(`/profile?tab=certificates&purchased=${purchase.id}&status=pending`, request.url))
    }

    // Query Midtrans API to get ACTUAL payment status
    const apiUrl = carbonConfig.is_production
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`

    const authHeader = Buffer.from(`${carbonConfig.midtrans_server_key}:`).toString('base64')

    console.log('🔍 Querying Midtrans API for real status...', apiUrl)

    const statusResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
      },
    })

    let transactionStatus = 'pending'
    let statusCode = '500'

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      transactionStatus = statusData.transaction_status || 'pending'
      statusCode = statusData.status_code || '500'

      console.log('✅ Midtrans Status Response:', {
        transaction_status: transactionStatus,
        status_code: statusCode,
        payment_type: statusData.payment_type,
      })
    } else {
      console.warn('⚠️ Midtrans API error, using redirect params as fallback')
      transactionStatus = searchParams.get('transaction_status') || 'pending'
      statusCode = searchParams.get('status_code') || '500'
    }

    // Update status based on transaction_status from Midtrans
    let newStatus = 'pending'
    
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      newStatus = 'completed'
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      newStatus = 'failed'
    }

    // Update purchase if status changed
    if (newStatus !== purchase.status) {
      await prisma.carbon_certificate_purchases.update({
        where: { id: purchase.id },
        data: {
          status: newStatus,
          metadata: {
            ...(purchase.metadata as Record<string, unknown>),
            verified_at: new Date().toISOString(),
            transaction_status: transactionStatus,
            status_code: statusCode,
            verified_via: 'handle_redirect_api_query',
          },
        },
      })

      console.log('✅ Purchase status updated:', { id: purchase.id, old: purchase.status, new: newStatus })
    } else {
      console.log('ℹ️ Status unchanged:', newStatus)
    }

    // Redirect to profile dengan purchase ID
    const redirectUrl = new URL(`/profile?tab=certificates&purchased=${purchase.id}`, request.url)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('❌ Error handling redirect:', error)
    return NextResponse.redirect(new URL('/carbon-market', request.url))
  }
}
