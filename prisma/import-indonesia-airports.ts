import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';

dotenv.config();

type RawAirport = {
  name?: string;
  icao?: string;
  iata?: string;
  lat?: number | null;
  lon?: number | null;
};

type InsertAirport = {
  name: string;
  icao: string | null;
  iata: string | null;
  country: string;
  lat: number;
  lon: number;
  is_active: boolean;
};

type AirportsDelegate = {
  deleteMany: (args: { where: { country: string } }) => Promise<unknown>;
  createMany: (args: { data: InsertAirport[] }) => Promise<unknown>;
};

const inputPath = process.argv[2] || 'public/bandara_indonesia_final.json';

const normalizeCode = (value?: string) => {
  const trimmed = (value || '').trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const airportsDelegate = (prisma as unknown as { airports: AirportsDelegate }).airports;

  try {
    const raw = await readFile(inputPath, 'utf-8');
    const parsed = JSON.parse(raw) as RawAirport[];

    const airports = parsed
      .filter((item) => typeof item.name === 'string' && item.name.trim().length > 0)
      .filter((item) => typeof item.lat === 'number' && Number.isFinite(item.lat))
      .filter((item) => typeof item.lon === 'number' && Number.isFinite(item.lon))
      .map((item) => ({
        name: item.name!.trim(),
        icao: normalizeCode(item.icao),
        iata: normalizeCode(item.iata),
        country: 'Indonesia',
        lat: Number(item.lat),
        lon: Number(item.lon),
        is_active: true
      }));

    await airportsDelegate.deleteMany({ where: { country: 'Indonesia' } });

    if (airports.length > 0) {
      await airportsDelegate.createMany({ data: airports });
    }

    console.log(`✅ Import selesai. Total bandara Indonesia tersimpan: ${airports.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Gagal import bandara Indonesia:', error);
  process.exit(1);
});
