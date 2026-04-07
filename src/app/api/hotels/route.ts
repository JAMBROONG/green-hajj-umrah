import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: [] },
        { status: 401 }
      );
    }

    // Get user's profile to get tenant_id using email
    const userProfile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
      select: { tenant_id: true },
    });

    if (!userProfile?.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'User has no tenant assigned', data: [] },
        { status: 400 }
      );
    }

    // Fetch hotels - if user has tenant, filter by tenant. Otherwise return all hotels
    const where: any = {}
    if (userProfile.tenant_id) {
      where.tenant_id = userProfile.tenant_id
    }

    const hotels = await prisma.hotels.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        hotel_emission: true,
      },
      orderBy: [
        { country: 'asc' },
        { name: 'asc' }
      ],
    });

    console.log(`🏨 Found ${hotels.length} hotels for tenant: ${userProfile.tenant_id || 'none (global)'}`);

    // Transform to response format with emission factor data
    const formattedHotels = hotels.map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      country_code: hotel.country,
      factor_emission: hotel.hotel_emission?.emission_factor ? parseFloat(hotel.hotel_emission.emission_factor.toString()) : 0,
      factor_emission_name: hotel.hotel_emission ? getEmissionFactorName(parseFloat(hotel.hotel_emission.emission_factor.toString())) : 'Tidak ada data',
    }));

    console.log(`✅ Formatted ${formattedHotels.length} hotels for response`);

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

// Helper function to get emission factor name based on factor value
function getEmissionFactorName(factor: number): string {
  if (factor >= 50) return 'Luxury'
  if (factor >= 35) return 'Premium'
  return 'Standard'
}
