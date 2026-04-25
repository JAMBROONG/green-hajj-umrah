import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { denyInProduction } from '@/lib/dev-guard'

/**
 * Manually update purchase status (developer-only)
 * POST /api/carbon-products/purchase/manual-update
 *
 * SECURITY:
 *   - Diblokir total di production. Source of truth status purchase HARUS
 *     berasal dari Midtrans webhook / verify endpoint, bukan input manual.
 *   - Di dev: wajib login + user hanya boleh ubah status purchase MILIK SENDIRI
 *     (tidak boleh sembarang user pengaruhi data orang lain).
 *   - Status terbatas ke 'pending' atau 'failed' — tidak boleh tandai
 *     'completed' manual karena itu bypass payment gateway.
 */
export async function POST(request: NextRequest) {
  const blocked = denyInProduction()
  if (blocked) return blocked

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { purchaseId, newStatus } = await request.json()

    if (!purchaseId || !newStatus) {
      return NextResponse.json(
        { error: 'purchaseId and newStatus required' },
        { status: 400 }
      )
    }

    // 'completed' tidak boleh — itu artinya bypass payment.
    // Untuk mark completed, harus lewat /verify yang call Midtrans status API.
    if (!['pending', 'failed'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Allowed: pending, failed (untuk completed gunakan /verify)' },
        { status: 400 }
      )
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Match by id + user_id supaya tidak bisa ubah purchase orang lain.
    const purchase = await prisma.carbon_certificate_purchases.findFirst({
      where: { id: purchaseId, user_id: userProfile.id },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    const updated = await prisma.carbon_certificate_purchases.update({
      where: { id: purchaseId },
      data: {
        status: newStatus,
        metadata: {
          ...(purchase.metadata as Record<string, unknown>),
          manually_updated_at: new Date().toISOString(),
          manually_updated_by: userProfile.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      purchase: {
        id: updated.id,
        status: updated.status,
        updated_at: updated.updated_at,
      },
      message: `Status updated to ${newStatus}`,
    })
  } catch (error) {
    console.error('❌ Manual update error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
