import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const revalidate = 0; // Disable caching

export async function GET() {
  try {
    const standards = await prisma.carbon_product_standards.findMany({
      where: { is_active: true },
      orderBy: { series: 'asc' },
    })

    return NextResponse.json(standards)
  } catch (error) {
    console.error('Error fetching carbon standards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch carbon standards' },
      { status: 500 }
    )
  }
}
