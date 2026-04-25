import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateThankYouCertificate } from '@/lib/certificate-generator'
import { generateCSRCertificate } from '@/lib/csr-certificate-generator'
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
    // 2) CSR activity participations — re-enabled.
    //    Schema sudah punya `metadata.order_id` (disimpan saat create di
    //    /api/csr-activities/participate), jadi bisa query Midtrans status API.
    //    Flow sama dengan carbon: query status → update DB → generate cert
    //    pakai tenant template. Payment config: tenant-specific dulu, fallback
    //    ke global carbonPaymentConfig (karena beberapa tenant memakai merchant
    //    admin untuk CSR).
    // ─────────────────────────────────────────────────────────────────
    const pendingCsr = await prisma.csr_activity_participations.findMany({
      where: { user_id: userProfile.id, status: 'pending' },
      include: {
        user: true,
        csr_activity: { include: { tenant: true } },
      },
    })

    let csrScanned = 0

    for (const donation of pendingCsr) {
      csrScanned++

      const meta = (donation.metadata as Record<string, unknown>) || {}
      const orderId = meta.order_id as string | undefined
      if (!orderId) continue // record lama tanpa order_id — tidak bisa di-sync

      // Resolve payment config untuk tenant activity ini
      const activityTenantId = donation.csr_activity?.tenant_id
      let serverKey: string | null = null
      let isProduction = false

      if (activityTenantId) {
        const tenantConfig = await prisma.tenantPaymentConfig.findUnique({
          where: { tenant_id: activityTenantId },
        })
        if (tenantConfig?.enabled && tenantConfig.midtrans_server_key) {
          serverKey = tenantConfig.midtrans_server_key
          isProduction = tenantConfig.is_production ?? false
        }
      }
      if (!serverKey && carbonConfig) {
        serverKey = carbonConfig.midtrans_server_key
        isProduction = carbonConfig.is_production
      }
      if (!serverKey) continue

      const statusData = await queryMidtrans(orderId, serverKey, isProduction)
      if (!statusData) continue

      const mappedStatus = mapMidtransStatus(statusData.transaction_status)
      if (mappedStatus === 'pending') continue

      // CSR pakai status 'confirmed' (bukan 'completed') untuk sukses, sesuai
      // konvensi di verify/route.ts dan company filter scope.
      const newStatus = mappedStatus === 'completed' ? 'confirmed' : 'cancelled'

      await prisma.csr_activity_participations.update({
        where: { id: donation.id },
        data: {
          status: newStatus,
          payment_method: donation.payment_method || 'midtrans',
          metadata: {
            ...meta,
            transaction_id: statusData.transaction_id,
            verified_at: new Date().toISOString(),
            verified_via: 'sync_pending',
          },
          updated_at: new Date(),
        },
      })
      updated.push({ type: 'csr', id: donation.id, status: newStatus })

      // Generate CSR certificate + bump total_donations_amount (sama dengan
      // verify endpoint) — hanya untuk transaksi yang baru saja dikonfirmasi
      // DAN belum punya sertifikat (prevent double-generate).
      if (newStatus === 'confirmed' && !donation.thank_you_certificate_url && donation.csr_activity) {
        try {
          ensureCertsDir()
          const donationDate = new Date(donation.created_at).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          const userMeta  = donation.user?.metadata as Record<string, unknown> | null
          const avatarUrl = (userMeta?.avatar_url as string | undefined) ?? null

          // Ambil donation amount murni (tanpa fee) dari breakdown — ini yang
          // tampil di sertifikat. Kalau breakdown tidak ada, fallback ke
          // donation.amount (gross).
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
          fs.writeFileSync(path.join(CERTS_DIR, filename), certBuffer)

          await prisma.csr_activity_participations.update({
            where: { id: donation.id },
            data: {
              thank_you_certificate_url: `${APP_BASE_URL}/api/cert-files/${filename}`,
            },
          })

          // Bump activity.total_donations_amount pakai donation murni, bukan
          // gross (supaya progress bar activity tidak inflate fee).
          await prisma.csr_activities.update({
            where: { id: donation.csr_activity.id },
            data: {
              total_donations_amount: { increment: displayAmount },
            },
          })
        } catch (e) {
          console.error('[sync-pending] csr cert gen failed:', donation.id, e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      scanned: { carbon: pendingCarbon.length, csr: csrScanned },
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
