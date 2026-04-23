import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type WasteEmissionFactorRow = {
  id: number;
  name: string;
  emission_factor: number;
  emission_factor_name: string;
  source: string | null;
  unit: string;
};

export async function GET() {
  try {
    const factors = await prisma.$queryRaw<WasteEmissionFactorRow[]>`
      SELECT id, name, emission_factor, emission_factor_name, source, unit
      FROM faktor_emisi_limbah
      ORDER BY name ASC
      LIMIT 500
    `;

    return NextResponse.json({
      items: factors.map((item) => ({
        id: Number(item.id),
        name: item.name,
        emissionFactor: Number(item.emission_factor),
        emissionFactorName: item.emission_factor_name,
        source: item.source,
        unit: item.unit
      })),
      count: factors.length
    });
  } catch (error) {
    console.error('Error fetching waste emission factors:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        items: [],
        count: 0,
        error: 'Terjadi kesalahan saat mengambil data faktor emisi limbah.',
        ...(process.env.NODE_ENV !== 'production' ? { details } : {})
      },
      { status: 500 }
    );
  }
}