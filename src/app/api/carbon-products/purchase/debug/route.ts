import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * Debug endpoint to view purchase details
 * POST /api/carbon-products/purchase/debug
 */
export async function POST(request: NextRequest) {
  try {
    // Skip auth for debugging
    const { purchaseId } = await request.json()

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
    }

    // Get purchase with all details
    const purchase = await prisma.carbon_certificate_purchases.findUnique({
      where: { id: purchaseId },
      include: {
        user: true,
        standard: true,
      },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Get Carbon Config
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()

    // Show all details
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
      carbonConfig: {
        merchant_id: carbonConfig?.midtrans_merchant_id,
        is_production: carbonConfig?.is_production,
      },
    }

    console.log('🔍 DEBUG INFO:', JSON.stringify(debugInfo, null, 2))

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    )
  }
}
