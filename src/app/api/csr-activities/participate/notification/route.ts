import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { generateCSRCertificate } from '@/lib/csr-certificate-generator'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Midtrans Notification Handler (Webhook) — CSR Donation
 *
 * POST /api/csr-activities/participate/notification
 *
 * Endpoint ini di-call oleh server Midtrans setelah status pembayaran
 * berubah (settlement / capture / deny / cancel / expire). Inilah yang
 * memungkinkan flow:
 *   1. Jemaah dapat VA → close app
 *   2. Bayar via m-banking nanti / dibayarin orang lain
 *   3. Bank ✓ → Midtrans push webhook ke endpoint ini
 *   4. Status DB di-update + sertifikat ter-generate (tanpa app harus terbuka)
 *   5. Saat jemaah buka app lagi → status sudah "Dikonfirmasi"
 *
 * Signature verification penting karena endpoint ini PUBLIC — tanpa auth,
 * siapa pun bisa POST. Hanya request dengan signature yang cocok yang di-trust.
 *
 * SETUP MIDTRANS DASHBOARD:
 *   Settings → Configuration → Payment Notification URL:
 *     https://YOUR_DOMAIN/api/csr-activities/participate/notification
 *
 *   Untuk dev: pakai ngrok / cloudflared tunnel ke localhost:3000.
 *
 * Resolution payment config: tenant-specific dulu (kalau tenant punya
 * Midtrans server key sendiri), fallback ke carbonPaymentConfig global.
 * Ini sama dengan resolution logic di participate/route.ts saat create.
 */

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('📬 CSR Midtrans Notification Received:', {
      order_id: body.order_id,
      transaction_id: body.transaction_id,
      transaction_status: body.transaction_status,
      payment_type: body.payment_type,
    })

    if (!body.order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Cari donation duluan supaya bisa resolve payment config tenant-specific
    // (signature key tergantung server_key yang dipakai saat create transaksi).
    const donation = await prisma.csr_activity_participations.findFirst({
      where: {
        metadata: { path: ['order_id'], equals: body.order_id },
      },
      include: {
        user: true,
        csr_activity: { include: { tenant: true } },
      },
    })

    if (!donation) {
      console.warn('⚠️ CSR donation not found for order:', body.order_id)
      // Tetap return 200 supaya Midtrans tidak retry — kalau order_id memang
      // tidak ada di DB kita, retry tidak akan menyelesaikan apa-apa.
      return NextResponse.json({ status: 'success', message: 'Order not found, ignored' })
    }

    // Resolve server_key untuk verify signature: prefer tenant config, fallback global
    let serverKey: string | null = null
    const activityTenantId = donation.csr_activity?.tenant_id
    if (activityTenantId) {
      const tenantConfig = await prisma.tenantPaymentConfig.findUnique({
        where: { tenant_id: activityTenantId },
      })
      if (tenantConfig?.enabled && tenantConfig.midtrans_server_key) {
        serverKey = tenantConfig.midtrans_server_key
      }
    }
    if (!serverKey) {
      const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
      if (carbonConfig?.midtrans_server_key) {
        serverKey = carbonConfig.midtrans_server_key
      }
    }

    if (!serverKey) {
      console.error('❌ No payment config available to verify signature')
      return NextResponse.json({ error: 'Payment config error' }, { status: 500 })
    }

    // Verify Midtrans signature: SHA512(order_id + status_code + gross_amount + server_key)
    const signatureInput = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`
    const expectedSignature = crypto.createHash('sha512').update(signatureInput).digest('hex')

    if (expectedSignature !== body.signature_key) {
      console.error('❌ Invalid signature for order:', body.order_id)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('✅ Signature verified for', body.order_id)

    const transactionStatus = body.transaction_status as string
    const paymentMethod: string = (body.payment_type as string) || 'midtrans'

    // ─── Settlement / Capture: payment confirmed ──────────────────────────
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      console.log('💰 CSR donation settled, updating status to confirmed...')

      // Idempotency: kalau sudah confirmed, skip update tapi pastikan cert ada
      const alreadyConfirmed = donation.status === 'confirmed'

      if (!alreadyConfirmed) {
        await prisma.csr_activity_participations.update({
          where: { id: donation.id },
          data: {
            status: 'confirmed',
            payment_method: paymentMethod,
            metadata: {
              ...((donation.metadata as Record<string, unknown>) || {}),
              transaction_id: body.transaction_id,
              payment_type: paymentMethod,
              settlement_time: body.settlement_time,
              gross_amount: body.gross_amount,
              verified_via: 'webhook_notification',
            },
            updated_at: new Date(),
          },
        })
        console.log('✅ CSR donation status → confirmed:', donation.id)
      }

      // Generate sertifikat kalau belum ada (idempotent — re-call webhook
      // tidak duplicate cert)
      if (!donation.thank_you_certificate_url && donation.csr_activity) {
        try {
          const appBaseUrl = (
            process.env.NEXTAUTH_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            new URL(request.url).origin
          ).replace(/\/$/, '')

          const certificatesDir = path.join(process.cwd(), 'storage', 'certificates')
          if (!fs.existsSync(certificatesDir)) {
            fs.mkdirSync(certificatesDir, { recursive: true })
          }

          const donationDate = new Date(donation.created_at).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })

          const userMeta  = donation.user?.metadata as Record<string, unknown> | null
          const avatarUrl = (userMeta?.avatar_url as string | undefined) ?? null

          // Pakai donation murni (dari breakdown) untuk amount yang ditampilkan
          // di sertifikat — bukan gross dengan fee.
          const meta = (donation.metadata as Record<string, unknown>) || {}
          const breakdown = (meta.breakdown as Record<string, unknown>) || {}
          const displayAmount = typeof breakdown.donation === 'number'
            ? breakdown.donation
            : parseFloat(donation.amount?.toString() || '0')

          const certBuffer = await generateCSRCertificate({
            recipientName: donation.user?.full_name || 'Donor',
            activityTitle: donation.csr_activity.title || 'Kegiatan CSR',
            activityCategory: donation.csr_activity.category || undefined,
            amount: displayAmount,
            donationDate,
            certificateNumber: `CSR-${donation.id.slice(-8).toUpperCase()}`,
            tenantId: donation.user?.tenant_id ?? null,
            avatarUrl,
          })

          const filename = `csr-cert-${donation.id}-${Date.now()}.jpg`
          fs.writeFileSync(path.join(certificatesDir, filename), certBuffer)

          const certUrl = `${appBaseUrl}/api/cert-files/${filename}`
          await prisma.csr_activity_participations.update({
            where: { id: donation.id },
            data: { thank_you_certificate_url: certUrl },
          })

          // Bump activity total_donations_amount pakai donation murni (bukan gross)
          await prisma.csr_activities.update({
            where: { id: donation.csr_activity.id },
            data: { total_donations_amount: { increment: displayAmount } },
          })

          console.log('✅ CSR certificate generated via webhook:', certUrl)
        } catch (certErr) {
          // Non-blocking: status sudah confirmed, cert bisa di-regenerate
          // nanti kalau perlu (misal via verify endpoint manual).
          console.error('❌ CSR certificate generation failed (webhook, non-blocking):', certErr)
        }
      }
    }

    // ─── Pending: VA dibuat tapi belum dibayar ─────────────────────────────
    else if (transactionStatus === 'pending') {
      console.log('⏳ CSR payment pending, awaiting customer action')
    }

    // ─── Deny / Cancel / Expire: payment failed ───────────────────────────
    else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire'
    ) {
      console.log('❌ CSR payment failed/cancelled, updating status...')

      await prisma.csr_activity_participations.update({
        where: { id: donation.id },
        data: {
          status: 'cancelled',
          metadata: {
            ...((donation.metadata as Record<string, unknown>) || {}),
            transaction_id: body.transaction_id,
            failure_reason: transactionStatus,
            verified_via: 'webhook_notification',
          },
          updated_at: new Date(),
        },
      })
      console.log('✅ CSR donation status → cancelled:', donation.id)
    }

    // Always 200 OK supaya Midtrans tidak retry untuk status yang tidak relevan
    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('❌ Error processing CSR notification:', error)
    // Return 200 supaya Midtrans tidak terus-menerus retry, tapi log error.
    // Kalau perlu retry manual → admin call /sync-pending-payments.
    return NextResponse.json(
      { status: 'success', error: 'Processing error logged' },
      { status: 200 }
    )
  }
}
