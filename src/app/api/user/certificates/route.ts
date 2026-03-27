import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const certificates = await prisma.carbon_certificate_purchases.findMany({
      where: { user_id: user.id },
      orderBy: { purchase_date: 'desc' },
      include: { product: true },
    })

    return NextResponse.json(
      certificates.map((c) => ({
        id: c.id,
        co2_equivalent: parseFloat(c.co2_equivalent.toString()),
        amount: parseFloat(c.amount.toString()),
        units: c.units,
        certificate_id: c.certificate_id,
        status: c.status,
        purchase_date: c.purchase_date,
        thank_you_certificate_url: c.thank_you_certificate_url,
        emission_reduction_certificate_url: c.emission_reduction_certificate_url,
        product_code: c.product?.product_code,
        product_name: c.product?.name,
      }))
    )
  } catch (error) {
    console.error('Error fetching certificates:', error)
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 })
  }
}
