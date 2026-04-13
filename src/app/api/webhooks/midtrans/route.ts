import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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

    console.log('Midtrans webhook received:', body)

    // Verify the notification with Midtrans
    const transactionStatus = await snap.transaction.notification(body)

    console.log('Transaction status:', transactionStatus)

    const transactionToken = transactionStatus.order_id
    const paymentStatus = transactionStatus.transaction_status

    // Find participation record by transaction reference
    const participation = await prisma.csr_activity_participations.findFirst({
      where: { transaction_reference: transactionToken },
    })

    if (!participation) {
      console.warn('Participation record not found for token:', transactionToken)
      return NextResponse.json(
        { error: 'Participation not found' },
        { status: 404 }
      )
    }

    // Update participation status based on Midtrans response
    let newStatus = participation.status

    if (paymentStatus === 'capture' || paymentStatus === 'settlement') {
      // Payment successful
      newStatus = 'confirmed'
      console.log('Payment confirmed for participation:', participation.id)
    } else if (paymentStatus === 'pending') {
      // Payment pending
      newStatus = 'pending'
    } else if (paymentStatus === 'deny' || paymentStatus === 'cancel' || paymentStatus === 'expire') {
      // Payment failed
      newStatus = 'cancelled'
      console.log('Payment failed for participation:', participation.id)
    }

    // Update participation record
    const updatedParticipation = await prisma.csr_activity_participations.update({
      where: { id: participation.id },
      data: {
        status: newStatus,
        notes: `Midtrans status: ${paymentStatus}`,
      },
    })

    console.log('Updated participation:', updatedParticipation)

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      status: newStatus,
    })
  } catch (error) {
    console.error('Error processing Midtrans webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
