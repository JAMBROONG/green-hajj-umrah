import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * Manually update purchase status (admin only for debugging)
 * POST /api/carbon-products/purchase/manual-update
 */
export async function POST(request: NextRequest) {
  try {
    // Skip auth for debugging
    const { purchaseId, newStatus } = await request.json()

    if (!purchaseId || !newStatus) {
      return NextResponse.json(
        { error: 'purchaseId and newStatus required' },
        { status: 400 }
      )
    }

    if (!['pending', 'completed', 'failed'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, completed, or failed' },
        { status: 400 }
      )
    }

    // Get purchase
    const purchase = await prisma.carbon_certificate_purchases.findUnique({
      where: { id: purchaseId },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    console.log(`🔄 Manually updating purchase status: ${purchase.status} → ${newStatus}`)

    // Update purchase status
    const updated = await prisma.carbon_certificate_purchases.update({
      where: { id: purchaseId },
      data: {
        status: newStatus,
        metadata: {
          ...(purchase.metadata as Record<string, unknown>),
          manually_updated_at: new Date().toISOString(),
        },
      },
    })

    console.log('✅ Purchase updated:', {
      id: updated.id,
      status: updated.status,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    )
  }
}
