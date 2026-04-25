import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { devLog, devError } from '@/lib/safe-logger'
import { generateOrderId } from '@/lib/order-id'

// Helper to create Midtrans transaction via HTTP
async function createMidtransTransaction(payload: any, paymentConfig: any) {
  const serverKey = paymentConfig.midtrans_server_key
  const isProduction = paymentConfig.is_production

  // Midtrans API endpoint
  const apiUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  // Create Basic Auth header
  const auth = Buffer.from(`${serverKey}:`).toString('base64')

  // Log payload + key prefix HANYA di dev. Di prod, info ini bisa tercatat
  // di log aggregator dan jadi vector recon Midtrans (server key prefix +
  // payload PII).
  devLog('🔑 Midtrans Auth:', { apiUrl, serverKeyLength: serverKey?.length })
  devLog('📤 Payload:', JSON.stringify(payload, null, 2))

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  devLog('✅ Midtrans Response:', {
    status: response.status,
    hasToken: !!data.token,
    error: data.error_messages,
  })

  if (!response.ok) {
    devError('❌ Full Midtrans Error:', JSON.stringify(data, null, 2))
    throw new Error(
      `Midtrans API error (${response.status}): ${data.error_messages?.join(', ') || response.statusText}`
    )
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email! },
    })

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    const { csr_activity_id, type, amount } = body

    // Validate input
    if (!csr_activity_id || typeof csr_activity_id !== 'string' || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: csr_activity_id and type' },
        { status: 400 }
      )
    }

    // Donation amount: minimal Rp 1.000, maximal Rp 5.000.000 (batas Midtrans).
    // Tanpa min, attacker bisa flood DB dengan record amount=0 atau amount=1.
    // Tanpa max, transaksi bakal di-reject Midtrans tapi record sudah dibuat.
    const DONATION_MIN_IDR = 1_000
    const DONATION_MAX_IDR = 5_000_000
    let validatedAmount = 0
    if (type === 'donate') {
      const amt = Number(amount)
      if (!Number.isFinite(amt) || !Number.isInteger(amt)) {
        return NextResponse.json(
          { error: 'Jumlah donasi harus berupa bilangan bulat (Rupiah).' },
          { status: 400 }
        )
      }
      if (amt < DONATION_MIN_IDR || amt > DONATION_MAX_IDR) {
        return NextResponse.json(
          {
            error: `Jumlah donasi harus antara Rp ${DONATION_MIN_IDR.toLocaleString('id-ID')} dan Rp ${DONATION_MAX_IDR.toLocaleString('id-ID')}.`,
          },
          { status: 400 }
        )
      }
      validatedAmount = amt
    }

    // Check if activity exists
    const activity = await prisma.csr_activities.findUnique({
      where: { id: csr_activity_id },
      include: { tenant: true },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    // Tenant isolation: jemaah hanya boleh donate ke CSR activity tenant-nya
    // sendiri. Tanpa check ini, user lintas-tenant bisa nyumbang ke kegiatan
    // tenant lain — masalah pelaporan dan akuntansi.
    // Profile tanpa tenant_id (mis. akun warisan) tetap diblokir explicit.
    if (!userProfile.tenant_id || activity.tenant_id !== userProfile.tenant_id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat berdonasi pada kegiatan CSR di luar tenant Anda.' },
        { status: 403 }
      )
    }

    // For donations: clean up any pending records to allow retry (but keep confirmed ones)
    if (type === 'donate') {
      await prisma.csr_activity_participations.deleteMany({
        where: {
          user_id: userProfile.id,
          csr_activity_id,
          status: 'pending',
        },
      })
      console.log('✅ Cleaned up pending donation records for retry')
    }

    // Volunteer registration is no longer supported - only donations
    if (type === 'volunteer') {
      return NextResponse.json(
        { error: 'Volunteer registration is no longer available. Please make a donation instead.' },
        { status: 400 }
      )
    }

    // For donation, create Midtrans transaction
    if (type === 'donate') {
      // Get payment config for this tenant
      // Try tenant-specific payment config first, fall back to global carbon config
      let paymentConfig: {
        midtrans_server_key: string
        is_production: boolean
        enabled?: boolean | null
      } | null = await prisma.tenantPaymentConfig.findUnique({
        where: { tenant_id: activity.tenant_id },
      })

      if (!paymentConfig || !paymentConfig.enabled) {
        console.log('⚠️ Tenant payment config not found/disabled, trying global carbonPaymentConfig...')
        const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
        if (carbonConfig && carbonConfig.midtrans_server_key) {
          paymentConfig = {
            midtrans_server_key: carbonConfig.midtrans_server_key,
            is_production: carbonConfig.is_production ?? false,
            enabled: true,
          }
          console.log('✅ Using global carbonPaymentConfig as fallback')
        }
      }

      if (!paymentConfig || !paymentConfig.enabled) {
        console.log('❌ Payment config not found or disabled for tenant:', activity.tenant_id)
        return NextResponse.json(
          { error: 'Payment is not configured for this tenant' },
          { status: 400 }
        )
      }

      // amount sudah divalidasi sebagai integer Rupiah dalam range
      // [DONATION_MIN_IDR, DONATION_MAX_IDR] di awal handler.
      const roundedDonation = validatedAmount

      // Fetch CSR admin fee for the user's tenant
      const serviceSetting = userProfile.tenant_id
        ? await prisma.service_setting.findUnique({ where: { tenant_id: userProfile.tenant_id } })
        : null
      const csrAdminFeePct = serviceSetting?.csr_admin_fee ? Number(serviceSetting.csr_admin_fee) : 0
      const csrAdminFee    = Math.round(roundedDonation * csrAdminFeePct / 100)
      const grossAmount    = roundedDonation + csrAdminFee

      const orderId = generateOrderId('CSR')

      // Create participation FIRST so we have the ID for the finish_url.
      // Breakdown disimpan di metadata.breakdown supaya jemaah, company, dan
      // admin bisa lihat rincian fee yang sama (auditable).
      const participation = await prisma.csr_activity_participations.create({
        data: {
          user_id: userProfile.id,
          csr_activity_id,
          type: 'donate',
          amount: grossAmount,
          status: 'pending',
          transaction_reference: '',
          metadata: {
            order_id: orderId, // dipakai sync-pending-payments query Midtrans
            breakdown: {
              donation: roundedDonation,
              csr_admin_fee: csrAdminFee,
              csr_admin_fee_pct: csrAdminFeePct,
              total: grossAmount,
            },
          },
        },
      })

      const appBaseUrl = (
        process.env.AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        request.nextUrl.origin
      ).replace(/\/$/, '')

      // Split item_details jadi 2 baris (donasi + biaya layanan) supaya
      // user lihat rincian transparan di Snap Midtrans. Sum quantity*price
      // wajib === gross_amount, jadi: donation + fee = grossAmount ✓
      const itemDetails: Array<{ id: string; price: number; quantity: number; name: string; category: string }> = [
        {
          id: csr_activity_id,
          price: roundedDonation,
          quantity: 1,
          name: 'CSR Donation',
          category: 'Donation',
        },
      ]
      if (csrAdminFee > 0) {
        itemDetails.push({
          id: 'csr-admin-fee',
          price: csrAdminFee,
          quantity: 1,
          name: 'Biaya Layanan',
          category: 'Fee',
        })
      }

      const transactionPayload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        customer_details: {
          first_name: userProfile.full_name?.split(' ')[0] || 'User',
          last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
          email: userProfile.email,
          phone: (userProfile.metadata as Record<string, string>)?.phone || '',
        },
        item_details: itemDetails,
        custom_field1: `csr_activity:${csr_activity_id}`,
        custom_field2: `user:${userProfile.id}`,
        callbacks: {
          finish: `${appBaseUrl}/csr-donations/${participation.id}`,
        },
      }

      const transaction = await createMidtransTransaction(transactionPayload, paymentConfig)

      // Update participation with the snap token
      await prisma.csr_activity_participations.update({
        where: { id: participation.id },
        data: { transaction_reference: transaction.token },
      })

      return NextResponse.json({
        id: participation.id,
        message: 'Donation transaction created',
        requiresPayment: true,
        snapToken: transaction.token,
        snapUrl: transaction.redirect_url,
        transactionId: transaction.transaction_id,
      })
    }

    return NextResponse.json(
      { error: 'Invalid donation type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Error processing donation:', error)
    return NextResponse.json(
      { error: 'Failed to process donation' },
      { status: 500 }
    )
  }
}
