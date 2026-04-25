import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/service-setting/me
 *
 * Returns service setting for the logged-in user's tenant.
 * Used by checkout pages to compute fee + PPN breakdown.
 *
 * Response:
 *   {
 *     idx_admin_fee_pct: 2.5,  // IDX admin fee % (carbon)
 *     tenant_fee_pct: 1.5,     // Tenant fee % (carbon)
 *     csr_admin_fee_pct: 3.0,  // Admin fee % for CSR donations
 *     ppn_pct: 11,             // PPN 11%
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
        csr_admin_fee_pct: 0,
        ppn_pct: 11,
      })
    }

    const setting = await prisma.service_setting.findUnique({
      where: { tenant_id: tenantId },
      select: { idx_admin_fee: true, idx_tenant_fee: true, csr_admin_fee: true },
    })

    return NextResponse.json({
      idx_admin_fee_pct:  setting?.idx_admin_fee  ? Number(setting.idx_admin_fee)  : 0,
      tenant_fee_pct:     setting?.idx_tenant_fee ? Number(setting.idx_tenant_fee) : 0,
      csr_admin_fee_pct:  setting?.csr_admin_fee  ? Number(setting.csr_admin_fee)  : 0,
      ppn_pct: 11,
    })
  } catch (error) {
    console.error('service-setting/me error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil setting', idx_admin_fee_pct: 0, tenant_fee_pct: 0, csr_admin_fee_pct: 0, ppn_pct: 11 },
      { status: 500 }
    )
  }
}
