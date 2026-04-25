import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { devLog, maskSensitive } from '@/lib/safe-logger'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Midtrans = require('midtrans-client')

// Initialize Midtrans Snap for verification
const snap = new Midtrans.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Body lengkap (order_id, transaction_id, gross_amount, fraud_status, dll)
    // hanya boleh tampil di dev. Production: log fingerprint saja.
    devLog('Midtrans webhook received:', body)

    // Verify the notification with Midtrans
    const transactionStatus = await snap.transaction.notification(body)

    devLog('Transaction status:', transactionStatus)

    const transactionToken = transactionStatus.order_id
    const paymentStatus = transactionStatus.transaction_status

    // Find participation record by transaction reference
    const participation = await prisma.csr_activity_participations.findFirst({
      where: { transaction_reference: transactionToken },
    })

    if (!participation) {
      // Production: log fingerprint masked, jangan masukkan token full ke
      // log aggregator publik.
      console.warn('[midtrans-webhook] Participation not found:', maskSensitive(transactionToken, 4, 4))
      return NextResponse.json(
        { error: 'Participation not found' },
        { status: 404 }
      )
    }

    // Update participation status based on Midtrans response
    let newStatus = participation.status

    if (paymentStatus === 'capture' || paymentStatus === 'settlement') {
      newStatus = 'confirmed'
    } else if (paymentStatus === 'pending') {
      newStatus = 'pending'
    } else if (paymentStatus === 'deny' || paymentStatus === 'cancel' || paymentStatus === 'expire') {
      newStatus = 'cancelled'
    }

    await prisma.csr_activity_participations.update({
      where: { id: participation.id },
      data: {
        status: newStatus,
        notes: `Midtrans status: ${paymentStatus}`,
      },
    })

    devLog('[midtrans-webhook] participation updated:', { id: participation.id, status: newStatus })

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      status: newStatus,
    })
  } catch (error) {
    console.error('[midtrans-webhook] error processing webhook')
    devLog('Webhook error detail:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
