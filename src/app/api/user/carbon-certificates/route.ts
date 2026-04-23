import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET() {
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
      where: {
        user_id: user.id,
      },
      include: {
        standard: {
          select: { id: true, name: true, series: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(
      certificates.map((c) => ({
        id: c.id,
        standard_id: c.standard_id,
        standard_series: c.standard?.series || '',
        standard_name: c.standard?.name || 'Carbon Certificate',
        units: c.units,
        co2_equivalent: c.co2_equivalent,
        amount: parseFloat(c.total_price?.toString() || '0'),
        total_price: parseFloat(c.total_price?.toString() || '0'),
        status: c.status,
        purchase_date: c.created_at,
        created_at: c.created_at,
        thank_you_certificate_url: c.thank_you_certificate_url,
        emission_reduction_certificate_url: c.emission_reduction_certificate_url,
        transaction_reference: c.transaction_reference,
      }))
    )
  } catch (error) {
    console.error('Error fetching carbon certificates:', error)
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 })
  }
}
