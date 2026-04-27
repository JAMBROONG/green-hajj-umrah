import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { devLog, devError } from '@/lib/safe-logger'
import { generateOrderId } from '@/lib/order-id'

// Helper to create Midtrans transaction via HTTP
async function createMidtransTransaction(payload: Record<string, unknown>, serverKey: string, isProduction: boolean) {
  const apiUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const auth = Buffer.from(`${serverKey}:`).toString('base64')

  // Log payload + Midtrans response HANYA di dev — production tidak boleh
  // tercatat full body (PII + Midtrans key recon).
  devLog('🔑 Midtrans Auth:', { apiUrl, serverKeyLength: serverKey?.length })
  devLog('📤 Carbon Product Purchase Payload:', JSON.stringify(payload, null, 2))

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
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    if (!carbonConfig) {
      return NextResponse.json({ error: 'Carbon payment configuration not found' }, { status: 500 })
    }

    if (!carbonConfig.enabled) {
      return NextResponse.json({ error: 'Carbon payment is currently disabled' }, { status: 503 })
    }

    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email! },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const body = await request.json()
    devLog('📥 Request body:', body)

    const { standard_series, units } = body

    if (!standard_series || typeof standard_series !== 'string') {
      return NextResponse.json({ error: 'standard_series tidak valid.' }, { status: 400 })
    }

    const unitsNum = Number(units)
    if (!Number.isInteger(unitsNum) || unitsNum < 1) {
      return NextResponse.json(
        { error: 'Jumlah unit minimal 1.' },
        { status: 400 }
      )
    }

    const standard = await prisma.carbon_product_standards.findUnique({
      where: { series: standard_series },
    })

    if (!standard) {
      devLog('❌ Standard not found:', standard_series)
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 })
    }

    if (!standard.is_active) {
      return NextResponse.json({ error: 'Standard is not available' }, { status: 400 })
    }

    // ── Idempotency guard (VAFinal-002) ──────────────────────────────
    // Cek apakah user sudah punya pending purchase IDENTIK (same standard +
    // same units) dalam 60 detik terakhir. Kalau ada, return existing record
    // — tidak buat transaksi Midtrans baru. Mencegah double-click bikin
    // 2 record + 2 invoice + 2 cost transaksi Midtrans.
    //
    // Window 60 detik cukup besar untuk cover network slowness, tapi cukup
    // kecil supaya user yang BENAR-BENAR mau beli kedua kalinya tidak
    // terblokir lama.
    const IDEMPOTENCY_WINDOW_MS = 60_000
    const recentPending = await prisma.carbon_certificate_purchases.findFirst({
      where: {
        user_id: userProfile.id,
        standard_id: standard.id,
        units: unitsNum,
        status: 'pending',
        created_at: { gte: new Date(Date.now() - IDEMPOTENCY_WINDOW_MS) },
      },
      orderBy: { created_at: 'desc' },
    })

    if (recentPending) {
      const meta = recentPending.metadata as Record<string, unknown> | null
      devLog('⏭️ Idempotent: returning existing pending purchase', recentPending.id)
      return NextResponse.json({
        id: recentPending.id,
        snapToken: recentPending.transaction_reference,
        snapUrl: meta?.snap_url ?? null,
        message: 'Existing pending transaction — silakan lanjutkan pembayaran sebelumnya.',
        idempotent: true,
      })
    }

    // Scope service_setting to the user's tenant (fallback to 0% if not set)
    const serviceSetting = userProfile.tenant_id
      ? await prisma.service_setting.findUnique({ where: { tenant_id: userProfile.tenant_id } })
      : null
    const adminFeeRate = serviceSetting?.idx_admin_fee
      ? parseFloat(serviceSetting.idx_admin_fee.toString()) / 100
      : 0
    const tenantFeeRate = serviceSetting?.idx_tenant_fee
      ? parseFloat(serviceSetting.idx_tenant_fee.toString()) / 100
      : 0
    const PPN_RATE = 0.11

    // Hitung semua sebagai INTEGER rupiah supaya total Midtrans valid.
    // Midtrans memvalidasi strict: gross_amount === Σ(item.price × item.quantity).
    // Kalau pakai pembagian + Math.round, hasil bisa beda 1-2 rupiah dan reject.
    const unitPriceInt = Math.round(parseFloat(standard.price.toString()))
    const subtotal     = unitPriceInt * unitsNum                                    // exact int
    const adminFee     = Math.round(subtotal * adminFeeRate)                        // exact int
    const tenantFee    = Math.round(subtotal * tenantFeeRate)                       // exact int
    const ppn          = Math.round((subtotal + adminFee + tenantFee) * PPN_RATE)   // exact int
    const totalAmount  = subtotal + adminFee + tenantFee + ppn                      // exact int sum

    // Midtrans membatasi transaksi maksimal Rp 5.000.000.
    // Hitung max units yang masih muat ke 5jt — supaya error message kasih saran konkret.
    const MAX_TRANSACTION_IDR = 5_000_000
    if (totalAmount > MAX_TRANSACTION_IDR) {
      const totalMultiplier = (1 + adminFeeRate + tenantFeeRate) * (1 + PPN_RATE)
      const maxUnits = Math.max(1, Math.floor(MAX_TRANSACTION_IDR / (unitPriceInt * totalMultiplier)))
      return NextResponse.json(
        {
          error: `Total transaksi (Rp ${totalAmount.toLocaleString('id-ID')}) melebihi batas Midtrans Rp 5.000.000. Maksimal ${maxUnits} unit untuk standar ini.`,
          maxUnits,
        },
        { status: 400 }
      )
    }

    // Build item_details dengan multi-line: subtotal + admin + tenant + ppn.
    // Setiap line punya quantity 1 (kecuali subtotal pakai unitsNum), jadi sum
    // = (unitPriceInt × unitsNum) + adminFee + tenantFee + ppn = totalAmount.
    type MidtransItem = { id: string; price: number; quantity: number; name: string; category: string }
    const itemDetails: MidtransItem[] = [
      {
        id: standard.id,
        price: unitPriceInt,
        quantity: unitsNum,
        name: `${standard.series} - ${unitsNum} tCO2e`,
        category: 'Carbon Credits',
      },
    ]
    // Hanya tambahkan baris fee/tax kalau > 0 supaya Snap UI tidak menampilkan
    // "Rp 0" line yang membingungkan jemaah.
    if (adminFee > 0)  itemDetails.push({ id: 'admin-fee',  price: adminFee,  quantity: 1, name: 'Biaya Admin',   category: 'Fee' })
    if (tenantFee > 0) itemDetails.push({ id: 'tenant-fee', price: tenantFee, quantity: 1, name: 'Biaya Layanan', category: 'Fee' })
    if (ppn > 0)       itemDetails.push({ id: 'ppn',        price: ppn,       quantity: 1, name: 'PPN 11%',       category: 'Tax' })

    const transactionPayload = {
      transaction_details: {
        order_id: generateOrderId('CARBON'),
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: userProfile.full_name?.split(' ')[0] || 'User',
        last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email,
        phone: (userProfile.metadata as Record<string, string>)?.phone || '',
      },
      item_details: itemDetails,
      custom_field1: `standard:${standard_series}`,
      custom_field2: `user:${userProfile.id}`,
      finish_redirect_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/carbon-products/purchase/handle-redirect`,
    }

    const transaction = await createMidtransTransaction(transactionPayload, carbonConfig.midtrans_server_key, carbonConfig.is_production)

    const purchase = await prisma.carbon_certificate_purchases.create({
      data: {
        user_id: userProfile.id,
        standard_id: standard.id,
        units: unitsNum,
        co2_equivalent: unitsNum,
        amount: totalAmount,
        total_price: totalAmount,
        transaction_reference: transaction.token,
        status: 'pending',
        metadata: {
          snap_url: transaction.redirect_url,
          order_id: transactionPayload.transaction_details.order_id,
          breakdown: {
            subtotal,        // exact integer
            admin_fee:  adminFee,
            admin_fee_pct:  Number((adminFeeRate * 100).toFixed(2)),
            tenant_fee: tenantFee,
            tenant_fee_pct: Number((tenantFeeRate * 100).toFixed(2)),
            ppn,
            ppn_pct: 11,
          },
        },
      },
    })

    devLog('✅ Purchase record created:', purchase.id)

    return NextResponse.json({
      id: purchase.id,
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
      message: 'Transaction created, please complete payment',
    })
  } catch (error) {
    console.error('❌ Error in carbon purchase:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
