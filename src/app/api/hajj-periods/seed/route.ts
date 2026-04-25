import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { denyInProduction } from '@/lib/dev-guard';

/**
 * POST /api/hajj-periods/seed
 *
 * SECURITY:
 *   - Diblokir di production (404). Seed hanya untuk fresh-install dev.
 *   - Di dev: tetap require login agar tidak dipanggil bot/scanner anonim.
 *   - Operasi idempotent: skip kalau period dengan year yang sama sudah ada.
 *   - Response error tidak lagi membawa stack trace (mitigasi VA-016).
 */
export async function POST() {
  const blocked = denyInProduction();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const hajjPeriods = [
      {
        year: 2026,
        start_date: new Date('2026-05-24'),
        end_date: new Date('2026-05-29'),
        registration_open_date: new Date('2026-03-24'),
        registration_close_date: new Date('2026-06-29'),
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed hajj periods',
      },
      { status: 500 }
    );
  }
}
