import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();

    // Find all active hajj periods where registration is open or will be open
    const hajjPeriods = await prisma.hajj_periods.findMany({
      where: {
        is_active: true,
        registration_close_date: {
          gte: today // Registration hasn't closed yet
        }
      },
      orderBy: {
        year: 'asc'
      }
    });

    const periods = hajjPeriods.map(period => {
      const registrationOpen = new Date(period.registration_open_date);
      const registrationClose = new Date(period.registration_close_date);
      const canRegister = today >= registrationOpen && today <= registrationClose;

      return {
        year: period.year,
        startDate: period.start_date,
        endDate: period.end_date,
        registrationOpenDate: period.registration_open_date,
        registrationCloseDate: period.registration_close_date,
        canRegister,
        isOpen: canRegister
      };
    });

    return NextResponse.json({
      periods,
      count: periods.length
    });

  } catch (error) {
    console.error('Error fetching hajj periods:', error);
    return NextResponse.json(
      { 
        periods: [],
        count: 0,
        error: 'Terjadi kesalahan saat mengambil data periode Haji.' 
      },
      { status: 500 }
    );
  }
}
