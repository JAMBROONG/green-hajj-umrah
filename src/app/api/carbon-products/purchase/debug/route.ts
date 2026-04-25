import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { denyInProduction } from '@/lib/dev-guard'

/**
 * Debug endpoint to view purchase details
 * POST /api/carbon-products/purchase/debug
 *
 * SECURITY:
 *   - Diblokir total di production (return 404)
 *   - Di dev/staging: wajib login + hanya boleh lihat purchase milik sendiri
 *   - Tidak mengembalikan field sensitif config (merchant_id) walaupun lolos guard
 */
export async function POST(request: NextRequest) {
  const blocked = denyInProduction()
  if (blocked) return blocked

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { purchaseId } = await request.json()

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Hanya boleh lihat purchase milik user yang sedang login.
    const purchase = await prisma.carbon_certificate_purchases.findFirst({
      where: { id: purchaseId, user_id: userProfile.id },
      include: {
        user: true,
        standard: true,
      },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Tidak ekspos config Midtrans (merchant_id) — info itu tidak diperlukan
    // untuk debugging UI, dan kalau bocor bantu attacker recon.
    const debugInfo = {
      purchase: {
        id: purchase.id,
        status: purchase.status,
        user_id: purchase.user_id,
        standard_id: purchase.standard_id,
        units: purchase.units,
        amount: purchase.amount,
        total_price: purchase.total_price,
        transaction_reference: purchase.transaction_reference,
        metadata: purchase.metadata,
        created_at: purchase.created_at,
        updated_at: purchase.updated_at,
      },
      standard: {
        name: purchase.standard?.name,
        series: purchase.standard?.series,
      },
      user: {
        email: purchase.user?.email,
        name: purchase.user?.full_name,
      },
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
