import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const revalidate = 0; // Disable caching

export async function GET() {
  try {
    const products = await prisma.carbon_products.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching carbon products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch carbon products' },
      { status: 500 }
    )
  }
}
