import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type SeaportRow = {
  id: number;
  source_id: number | null;
  name: string;
  alias_name: string | null;
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
  address: string | null;
  country_code: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    const seaports = await prisma.$queryRaw<SeaportRow[]>`
      SELECT id, source_id, name, alias_name, latitude, longitude, province, city, address, country_code
      FROM seaports
      WHERE is_active = true
      ORDER BY name ASC
      LIMIT 5000
    `;

    const filtered = q
      ? seaports.filter((item) => {
          const haystack = [
            item.name,
            item.alias_name || '',
            item.city || '',
            item.province || '',
            item.address || ''
          ]
            .join(' ')
            .toLowerCase();

          return haystack.includes(q);
        })
      : seaports;

    return NextResponse.json({
      seaports: filtered.map((item) => ({
        id: Number(item.id),
        sourceId: item.source_id !== null ? Number(item.source_id) : null,
        name: item.name,
        aliasName: item.alias_name,
        lat: Number(item.latitude),
        lon: Number(item.longitude),
        province: item.province,
        city: item.city,
        address: item.address,
        countryCode: item.country_code
      })),
      count: filtered.length
    });
  } catch (error) {
    console.error('Error fetching seaports:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        seaports: [],
        count: 0,
        error: 'Terjadi kesalahan saat mengambil data pelabuhan.',
        ...(process.env.NODE_ENV !== 'production' ? { details } : {})
      },
      { status: 500 }
    );
  }
}
