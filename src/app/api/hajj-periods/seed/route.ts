import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const hajjPeriods = [
      {
        year: 2026,
        start_date: new Date('2026-05-24'),
        end_date: new Date('2026-05-29'),
        registration_open_date: new Date('2026-03-24'), // 2 months before
        registration_close_date: new Date('2026-06-29'), // 1 month after
        is_active: true
      },
      {
        year: 2027,
        start_date: new Date('2027-05-13'),
        end_date: new Date('2027-05-18'),
        registration_open_date: new Date('2027-03-13'),
        registration_close_date: new Date('2027-06-18'),
        is_active: true
      },
      {
        year: 2028,
        start_date: new Date('2028-05-02'),
        end_date: new Date('2028-05-07'),
        registration_open_date: new Date('2028-03-02'),
        registration_close_date: new Date('2028-06-07'),
        is_active: true
      }
    ];

    const results = [];

    for (const period of hajjPeriods) {
      const existing = await prisma.hajj_periods.findUnique({
        where: { year: period.year }
      });

      if (existing) {
        results.push({ year: period.year, status: 'already exists' });
      } else {
        await prisma.hajj_periods.create({
          data: period
        });
        results.push({ year: period.year, status: 'created' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Hajj periods seeded successfully',
      results
    });

  } catch (error) {
    console.error('Error seeding hajj periods:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to seed hajj periods',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
