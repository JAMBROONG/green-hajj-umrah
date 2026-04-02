import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';

const VEHICLE_FACTORS = [
  {
    name: 'Mobil',
    type: 'mobil',
    emission_factor: 0.16725,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Mobil Listrik',
    type: 'mobil-listrik',
    emission_factor: 0,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Bus',
    type: 'bus',
    emission_factor: 0.10385,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Bus Listrik',
    type: 'bus-listrik',
    emission_factor: 0,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Kereta',
    type: 'kereta',
    emission_factor: 0.03546,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Pesawat Ekonomi',
    type: 'pesawat-ekonomi',
    emission_factor: 0.10916,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Pesawat Bisnis',
    type: 'pesawat-bisnis',
    emission_factor: 0.43663,
    emission_factor_name: 'kg CO2e/km'
  },
  {
    name: 'Kapal',
    type: 'kapal',
    emission_factor: 0.1127,
    emission_factor_name: 'kg CO2e/km'
  }
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DEV_DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL belum diset.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE jenis_kendaraan
      ALTER COLUMN emission_factor TYPE NUMERIC(12, 6),
      ALTER COLUMN emission_factor DROP NOT NULL
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS jenis_kendaraan_name_type_key
      ON jenis_kendaraan(name, type)
    `);

    for (const item of VEHICLE_FACTORS) {
      await prisma.$executeRaw`
        INSERT INTO jenis_kendaraan (
          name,
          emission_factor,
          type,
          emission_factor_name,
          created_at,
          updated_at
        )
        VALUES (
          ${item.name},
          ${item.emission_factor},
          ${item.type},
          ${item.emission_factor_name},
          NOW(),
          NOW()
        )
        ON CONFLICT (name, type) DO UPDATE SET
          emission_factor = EXCLUDED.emission_factor,
          emission_factor_name = EXCLUDED.emission_factor_name,
          updated_at = NOW()
      `;
    }

    console.log(`✅ Seed faktor emisi kendaraan selesai: ${VEHICLE_FACTORS.length} data`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Gagal seed faktor emisi kendaraan:', error);
  process.exit(1);
});