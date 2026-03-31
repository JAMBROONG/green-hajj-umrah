import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Get Midtrans configuration for client-side Snap
 * GET /api/carbon-products/config
 */
export async function GET() {
  try {
    // Get Carbon Payment Config from database
    const carbonConfig = await prisma.carbonPaymentConfig.findFirst()
    
    if (!carbonConfig) {
      return NextResponse.json(
        { error: 'Payment configuration not found' },
        { status: 500 }
      )
    }

    if (!carbonConfig.enabled) {
      return NextResponse.json(
        { error: 'Carbon payment is currently disabled' },
        { status: 503 }
      )
    }

    // Only return client key (safe to expose to frontend)
    return NextResponse.json({
      clientKey: carbonConfig.midtrans_client_key,
      isProduction: carbonConfig.is_production,
    })
  } catch (error) {
    console.error('❌ Error fetching payment config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}
