import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { generateThankYouCertificate } from '@/lib/certificate-generator'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Midtrans Notification Handler (Webhook)
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

    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    if (!carbonConfig) {
      console.error('❌ Carbon payment config not found')
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 })
    }

    // Verify Midtrans signature
    const signatureKey = `${body.order_id}${body.status_code}${body.gross_amount}${carbonConfig.midtrans_server_key}`
    const signature = crypto.createHash('sha512').update(signatureKey).digest('hex')

    if (signature !== body.signature_key) {
      console.error('❌ Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('✅ Signature verified')

    const transactionStatus = body.transaction_status
    const paymentMethod: string | null = body.payment_type ?? null

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      console.log('💰 Payment successful, updating purchase status...')

      const purchase = await prisma.carbon_certificate_purchases.findFirst({
        where: {
          metadata: { path: ['order_id'], equals: body.order_id },
        },
      })

      if (!purchase) {
        console.warn('⚠️ Purchase not found for order:', body.order_id)
        return NextResponse.json({ status: 'success' })
      }

      // Update status + payment_method
      await prisma.carbon_certificate_purchases.update({
        where: { id: purchase.id },
        data: {
          status: 'completed',
          ...(paymentMethod ? { payment_method: paymentMethod } : {}),
          metadata: {
            ...(purchase.metadata as Record<string, unknown>),
            transaction_id: body.transaction_id,
            payment_type: paymentMethod,
            settlement_time: body.settlement_time,
            gross_amount: body.gross_amount,
          },
        },
      })

      console.log('✅ Purchase status updated to completed:', purchase.id)

      // Generate certificate if not already generated
      if (!purchase.thank_you_certificate_url) {
        try {
          const fullPurchase = await prisma.carbon_certificate_purchases.findUnique({
            where: { id: purchase.id },
            include: { user: true, standard: true },
          })

          if (fullPurchase) {
            const appBaseUrl = (
              process.env.NEXTAUTH_URL ||
              process.env.NEXT_PUBLIC_BASE_URL ||
              new URL(request.url).origin
            ).replace(/\/$/, '')

            // Tulis ke storage/certificates/ (di luar public/) supaya tidak
            // bentrok dengan dynamic route /certificates/[id], lalu serve via
            // /api/cert-files/{filename} yang sudah ada.
            const certificatesDir = path.join(process.cwd(), 'storage', 'certificates')
            if (!fs.existsSync(certificatesDir)) {
              fs.mkdirSync(certificatesDir, { recursive: true })
            }

            const purchaseDate = new Date(fullPurchase.created_at).toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })

            const recipientName = fullPurchase.user?.full_name || 'Carbon Supporter'
            // Pakai `series` dulu (kode pendek mis. "VCS-1234") supaya muat di
            // sertifikat tanpa overflow. Fallback ke `name` kalau series kosong.
            const productName   = fullPurchase.standard?.series || fullPurchase.standard?.name || 'Carbon Certificate'
            const units         = fullPurchase.units || 0
            const userMeta      = fullPurchase.user?.metadata as Record<string, unknown> | null
            const avatarUrl     = (userMeta?.avatar_url as string | undefined) ?? null
            const certificateId = purchase.id.slice(0, 8).toUpperCase()

            const certBuffer = await generateThankYouCertificate({
              recipientName,
              activityTitle: productName,
              units,
              amount: parseFloat(fullPurchase.total_price?.toString() || '0'),
              donationDate: purchaseDate,
              certificateNumber: certificateId,
              tenantId: fullPurchase.user?.tenant_id ?? null,
              avatarUrl,
            })

            const filename = `carbon-thankyou-${purchase.id}-${Date.now()}.jpg`
            fs.writeFileSync(path.join(certificatesDir, filename), certBuffer)

            const certUrl = `${appBaseUrl}/api/cert-files/${filename}`
            await prisma.carbon_certificate_purchases.update({
              where: { id: purchase.id },
              data: {
                thank_you_certificate_url: certUrl,
                certificate_id: certificateId,
              },
            })

            console.log('✅ Certificate generated via webhook:', certUrl)
          }
        } catch (certErr) {
          console.error('❌ Certificate generation failed (webhook, non-blocking):', certErr)
        }
      }
    } else if (transactionStatus === 'pending') {
      console.log('⏳ Payment pending, awaiting customer action')
    } else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire'
    ) {
      console.log('❌ Payment failed/cancelled, updating purchase status...')

      const purchase = await prisma.carbon_certificate_purchases.findFirst({
        where: {
          metadata: { path: ['order_id'], equals: body.order_id },
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

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('❌ Error processing notification:', error)
    return NextResponse.json({ status: 'success', error: 'Processing error logged' }, { status: 200 })
  }
}
