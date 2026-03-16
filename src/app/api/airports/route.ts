import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type AirportRecord = {
  id: number;
  name: string;
  iata: string | null;
  icao: string | null;
  country: string;
  lat: number;
  lon: number;
};

type AirportsDelegate = {
  findMany: (args: {
    where: {
      is_active: boolean;
      country?: string;
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { iata: { contains: string; mode: 'insensitive' } }
        | { icao: { contains: string; mode: 'insensitive' } }
      >;
    };
    orderBy: Array<{ iata: 'asc' } | { name: 'asc' }>;
    take: number;
  }) => Promise<AirportRecord[]>;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const q = searchParams.get('q')?.trim() || '';
    const airportsDelegate = (prisma as unknown as { airports: AirportsDelegate }).airports;

    const airports = await airportsDelegate.findMany({
      where: {
        is_active: true,
        ...(country ? { country } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { iata: { contains: q, mode: 'insensitive' } },
                { icao: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: [{ iata: 'asc' }, { name: 'asc' }],
      take: 500
    });

    return NextResponse.json({
      airports: airports.map((airport) => ({
        id: airport.id,
        name: airport.name,
        iata: airport.iata,
        icao: airport.icao,
        country: airport.country,
        lat: airport.lat,
        lon: airport.lon
      })),
      count: airports.length
    });
  } catch (error) {
    console.error('Error fetching airports:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        airports: [],
        count: 0,
        error: 'Terjadi kesalahan saat mengambil data bandara.',
        ...(process.env.NODE_ENV !== 'production' ? { details } : {})
      },
      { status: 500 }
    );
  }
}
