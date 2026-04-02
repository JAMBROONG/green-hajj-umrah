import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const hotels = await prisma.hotels.findMany({
      include: {
        hotel_emission: true,
      },
      orderBy: [
        { country: 'asc' },
        { name: 'asc' }
      ],
    });

    // Transform to response format with emission factor data
    const formattedHotels = hotels.map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      country_code: hotel.country,
      country: hotel.country,
      factor_emission: hotel.hotel_emission?.emission_factor ? parseFloat(hotel.hotel_emission.emission_factor.toString()) : 0,
      factor_emission_name: hotel.hotel_emission ? 'kg CO2e/malam' : 'Tidak ada data',
      hotel_emission_id: hotel.hotel_emission_id,
    }));

    console.log(`✅ Fetched ${formattedHotels.length} hotels with emission factors`);

    return NextResponse.json(
      {
        success: true,
        data: formattedHotels,
        count: formattedHotels.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching hotels:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hotels';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: [],
      },
      { status: 500 }
    );
  }
}
