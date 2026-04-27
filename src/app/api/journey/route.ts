import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { HajiJourney } from '@/lib/types';
import { initializePhases } from '@/lib/utils';

export const runtime = 'nodejs'

/** Batas atas emisi yang masuk akal — 1.000 tCO2e cukup ekstrem untuk satu jemaah. */
const MAX_TOTAL_EMISSION = 1_000_000; // dalam unit DB (kg atau gram, conservative cap)
/** Cap ukuran payload journey — phases JSON tidak boleh melebihi 50KB. */
const MAX_JOURNEY_BYTES = 50_000;

/**
 * Validasi totalEmission: harus number finite, >= 0, dan <= MAX_TOTAL_EMISSION.
 *
 * Pola lama `totalEmission || 0` lolos: Infinity (truthy) ✗, -100 (truthy) ✗,
 * "abc" (truthy) ✗, []/{} (truthy) ✗. Pattern itu hanya nge-handle falsy
 * (undefined/null/NaN/0). Validate ketat sebelum query DB.
 */
function validateTotalEmission(value: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: 0 };
  if (typeof value !== 'number') {
    return { ok: false, error: 'totalEmission harus berupa angka.' };
  }
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'totalEmission harus angka finite (bukan NaN/Infinity).' };
  }
  if (value < 0) {
    return { ok: false, error: 'totalEmission tidak boleh negatif.' };
  }
  if (value > MAX_TOTAL_EMISSION) {
    return { ok: false, error: `totalEmission melebihi batas wajar (max ${MAX_TOTAL_EMISSION}).` };
  }
  return { ok: true, value };
}

/**
 * Validasi struktur object journey — minimal cek bentuk (currentPhase number,
 * phases object) dan ukuran serialize. Tidak validate per-field di setiap
 * phase karena daftar phase bisa berkembang; cap ukuran cukup untuk mitigasi
 * payload bomb (VAv2-005).
 */
function validateJourney(value: unknown): { ok: true; value: object } | { ok: false; error: string } {
  if (value === null || value === undefined) {
    return { ok: false, error: 'journey wajib diisi.' };
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'journey harus berupa object.' };
  }

  const obj = value as Record<string, unknown>;
  if (typeof obj.currentPhase !== 'number' || !Number.isInteger(obj.currentPhase) || obj.currentPhase < 0 || obj.currentPhase > 100) {
    return { ok: false, error: 'journey.currentPhase tidak valid.' };
  }
  if (typeof obj.phases !== 'object' || obj.phases === null || Array.isArray(obj.phases)) {
    return { ok: false, error: 'journey.phases harus berupa object.' };
  }

  // Size cap — JSON payload yang masuk akal untuk semua phase + categories
  // tidak boleh lebih besar dari 50KB. Mencegah payload bomb / DoS.
  let size: number;
  try {
    size = JSON.stringify(value).length;
  } catch {
    return { ok: false, error: 'journey tidak dapat di-serialize (struktur invalid).' };
  }
  if (size > MAX_JOURNEY_BYTES) {
    return { ok: false, error: `journey terlalu besar (${size} bytes, max ${MAX_JOURNEY_BYTES}).` };
  }

  return { ok: true, value: obj };
}

// GET - Fetch user's journey (backward compatibility - gets first trip's journey)
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const trip = await prisma.trips.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      journeys: true
    }
  });

  if (!trip || !trip.journeys) {
    const defaultJourney = initializePhases();
    return NextResponse.json({ journey: defaultJourney });
  }

  const journeyData = trip.journeys;
  return NextResponse.json({ journey: journeyData.phases as unknown as HajiJourney });
}

// POST - Create or update journey (backward compatibility - updates first trip's journey)
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON valid.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body harus object JSON.' }, { status: 400 });
  }

  const { journey, totalEmission } = body as { journey?: unknown; totalEmission?: unknown };

  // Validasi schema sebelum query DB. Reject early dengan 400 + pesan jelas.
  const journeyCheck = validateJourney(journey);
  if (!journeyCheck.ok) {
    return NextResponse.json({ error: journeyCheck.error }, { status: 400 });
  }
  const emissionCheck = validateTotalEmission(totalEmission);
  if (!emissionCheck.ok) {
    return NextResponse.json({ error: emissionCheck.error }, { status: 400 });
  }

  const safeJourney = journeyCheck.value;
  const safeEmission = emissionCheck.value;
  const userId = session.user.id;
  const tenantId = session.user.tenantId || process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default';

  try {
    // Bungkus dalam $transaction supaya: (a) trip create + journey upsert +
    // trip update jadi atomic — kalau journey upsert gagal, trip baru tidak
    // ke-commit. (b) saat dua request concurrent (mis. 2 tab), Postgres
    // serializable isolation bisa pastikan tidak ada lost update parsial.
    const result = await prisma.$transaction(async (tx) => {
      let trip = await tx.trips.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (!trip) {
        trip = await tx.trips.create({
          data: {
            name: 'Perjalanan Default',
            type: 'umrah',
            start_date: new Date(),
            end_date: new Date(),
            user_id: userId,
            tenant_id: tenantId,
            total_emission: safeEmission,
            status: 'ongoing',
          },
        });
      }

      const data = await tx.journey_data.upsert({
        where: { trip_id: trip.id },
        create: {
          trip_id: trip.id,
          phases: safeJourney as Prisma.InputJsonValue,
          total_emission: safeEmission,
        },
        update: {
          phases: safeJourney as Prisma.InputJsonValue,
          total_emission: safeEmission,
        },
      });

      await tx.trips.update({
        where: { id: trip.id },
        data: { total_emission: safeEmission },
      });

      return data;
    });

    return NextResponse.json({ journey: result });
  } catch (error) {
    console.error('journey upsert error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan journey.' }, { status: 500 });
  }
}
