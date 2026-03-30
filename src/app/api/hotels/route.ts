import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const hotels = await prisma.hotels.findMany({
      orderBy: [
        { country_code: 'asc' },
        { name: 'asc' }
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: hotels,
        count: hotels.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch hotels',
      },
      { status: 500 }
    );
  }
}
