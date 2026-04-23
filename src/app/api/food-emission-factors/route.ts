import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type FoodEmissionFactorRow = {
  id: number;
  name: string;
  emission_factor: number;
  emission_factor_name: string;
};

export async function GET() {
  try {
    const factors = await prisma.$queryRaw<FoodEmissionFactorRow[]>`
      SELECT id, name, emission_factor, emission_factor_name
      FROM faktor_emisi_makanan
      ORDER BY emission_factor ASC, name ASC
      LIMIT 500
    `;

    return NextResponse.json({
      items: factors.map((item) => ({
        id: Number(item.id),
        name: item.name,
        emissionFactor: Number(item.emission_factor),
        emissionFactorName: item.emission_factor_name
      })),
      count: factors.length
    });
  } catch (error) {
    console.error('Error fetching food emission factors:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        items: [],
        count: 0,
        error: 'Terjadi kesalahan saat mengambil data faktor emisi makanan.',
        ...(process.env.NODE_ENV !== 'production' ? { details } : {})
      },
      { status: 500 }
    );
  }
}
