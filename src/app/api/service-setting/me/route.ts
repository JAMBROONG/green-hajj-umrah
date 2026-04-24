import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/service-setting/me
 *
 * Returns service setting for the logged-in user's tenant.
 * Used by checkout page to compute admin fee + tenant fee + PPN breakdown.
 *
 * Response:
 *   {
 *     idx_admin_fee_pct: 2.5,   // IDX admin fee %, from service_setting.idx_admin_fee
 *     tenant_fee_pct: 1.5,      // Tenant-specific fee %, from service_setting.tenant_fee_pct
 *     ppn_pct: 11,              // tetap 11% (UU Harmonisasi Perpajakan)
 *   }
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = (session.user as { tenantId?: string }).tenantId
    if (!tenantId) {
      return NextResponse.json({
        idx_admin_fee_pct: 0,
        tenant_fee_pct: 0,
        ppn_pct: 11,
      })
    }

    const setting = await prisma.service_setting.findUnique({
      where: { tenant_id: tenantId },
      select: { idx_admin_fee: true, idx_tenant_fee: true },
    })

    return NextResponse.json({
      idx_admin_fee_pct: setting?.idx_admin_fee ? Number(setting.idx_admin_fee) : 0,
      tenant_fee_pct: setting?.idx_tenant_fee ? Number(setting.idx_tenant_fee) : 0,
      ppn_pct: 11,
    })
  } catch (error) {
    console.error('service-setting/me error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil setting', idx_admin_fee_pct: 0, tenant_fee_pct: 0, ppn_pct: 11 },
      { status: 500 }
    )
  }
}
