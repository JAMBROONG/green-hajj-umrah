import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateThankYouCertificate } from '@/lib/certificate-generator'
import * as fs from 'fs'
import * as path from 'path'

/**
 * POST /api/user/sync-pending-payments
 *
 * When the app opens (from /profile page), query Midtrans for ALL pending
 * transactions belonging to the current user — across both
 * carbon_certificate_purchases and csr_activity_participations — and sync
 * their status. This catches the common case where the user:
 *   1. Starts a checkout, gets a VA number
 *   2. Closes the app
 *   3. Pays via mobile banking later
 *   4. Reopens the app → status must reflect reality (paid), not "pending"
 *
 * The Midtrans status API requires an order_id (see
 * https://docs.midtrans.com/reference/get-transaction-status), so we rely on
 * the `metadata.order_id` field persisted at creation time.
 *
 * This endpoint is idempotent, safe to call on every app open, and does not
 * throw on individual failures — errors for one transaction do not block the
 * rest. Returns a summary of what changed.
 */

type MidtransStatus = {
  transaction_status?: string
  status_code?: string
  transaction_id?: string
  fraud_status?: string
  gross_amount?: string
}


const CERTS_DIR = path.join(process.cwd(), 'storage', 'certificates')

function mapMidtransStatus(ts: string | undefined): 'completed' | 'failed' | 'pending' {
  if (ts === 'settlement' || ts === 'capture') return 'completed'
  if (ts === 'deny' || ts === 'cancel' || ts === 'expire') return 'failed'
  return 'pending'
}

async function queryMidtrans(
  orderId: string,
  serverKey: string,
  isProduction: boolean
): Promise<MidtransStatus | null> {
  const apiUrl = isProduction
    ? `https://api.midtrans.com/v2/${encodeURIComponent(orderId)}/status`
    : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`

  const authHeader = Buffer.from(`${serverKey}:`).toString('base64')

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: { Authorization: `Basic ${authHeader}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      // 404 means Midtrans has no record — treat as unknown, leave pending
      return null
    }
    return (await res.json()) as MidtransStatus
  } catch {
    return null
  }
}

function ensureCertsDir() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true })
  }
}

export async function POST(request: Request) {
  try {
    const APP_BASE_URL = (
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(request.url).origin
    ).replace(/\/$/, '')

    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
    const updated: Array<{ type: 'carbon' | 'csr'; id: string; status: string }> = []

    // ─────────────────────────────────────────────────────────────────
    // 1) Carbon certificate purchases (uses global carbonPaymentConfig)
    // ─────────────────────────────────────────────────────────────────
    const pendingCarbon = await prisma.carbon_certificate_purchases.findMany({
      where: { user_id: userProfile.id, status: 'pending' },
      include: { user: true, standard: true },
    })

    for (const purchase of pendingCarbon) {
      const meta = (purchase.metadata as Record<string, unknown>) || {}
      const orderId = meta.order_id as string | undefined
      if (!orderId || !carbonConfig) continue

      const statusData = await queryMidtrans(
        orderId,
        carbonConfig.midtrans_server_key,
        carbonConfig.is_production
      )
      if (!statusData) continue

      const newStatus = mapMidtransStatus(statusData.transaction_status)
      if (newStatus === 'pending') continue

      await prisma.carbon_certificate_purchases.update({
        where: { id: purchase.id },
        data: {
          status: newStatus,
          metadata: {
            ...meta,
            transaction_id: statusData.transaction_id,
            verified_at: new Date().toISOString(),
            verified_via: 'sync_pending',
          },
        },
      })
      updated.push({ type: 'carbon', id: purchase.id, status: newStatus })

      if (newStatus === 'completed' && !purchase.thank_you_certificate_url) {
        try {
          ensureCertsDir()
          const purchaseDate = new Date(purchase.created_at).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          const productName =
            purchase.standard?.name || purchase.standard?.series || 'Carbon Certificate'

          const certBuffer = await generateThankYouCertificate({
            recipientName: purchase.user?.full_name || 'Carbon Supporter',
            activityTitle: `${productName} (${purchase.units || 0} tCO2e)`,
            amount: parseFloat(purchase.total_price?.toString() || '0'),
            donationDate: purchaseDate,
            certificateNumber: purchase.id.substring(0, 8).toUpperCase(),
            tenantId: purchase.user?.tenant_id ?? null,
          })
          const filename = `carbon-thankyou-${purchase.id}-${Date.now()}.jpg`
          fs.writeFileSync(path.join(CERTS_DIR, filename), certBuffer)

          await prisma.carbon_certificate_purchases.update({
            where: { id: purchase.id },
            data: { thank_you_certificate_url: `${APP_BASE_URL}/api/cert-files/${filename}` },
          })
        } catch (e) {
          console.error('[sync-pending] carbon cert gen failed:', purchase.id, e)
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 2) CSR activity participations — disabled
    //    CSR participation schema belum punya field metadata/order_id,
    //    jadi ga bisa query status ke Midtrans by order_id.
    //    Sync dilakukan via redirect handler & verify endpoint aja.
    // ─────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      scanned: { carbon: pendingCarbon.length, csr: 0 },
      updated,
    })
  } catch (error) {
    console.error('[sync-pending] fatal:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'sync failed' },
      { status: 500 }
    )
  }
}
