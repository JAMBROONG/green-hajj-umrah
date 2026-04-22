import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ series: string }> }
) {
  try {
    const { series } = await params;
    const standard = await prisma.carbon_product_standards.findUnique({
      where: { series },
      include: {
        products: {
          include: {
            product: true
          }
        }
      }
    });

    if (!standard) {
      return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
    }

    return NextResponse.json(standard);
  } catch (error) {
    console.error('Error fetching standard details:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
