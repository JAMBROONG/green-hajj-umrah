import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';

const WASTE_FACTORS = [
  {
    name: 'Plastik',
    emission_factor: 8.98311,
    source: 'DEFRA. Plastic (Average plastics. Landfill)',
    unit: 'tonne'
  },
  {
    name: 'Kertas',
    emission_factor: 1164.4894,
    source: 'DEFRA. Paper and board (Mix. Landfill)',
    unit: 'tonne'
  },
  {
    name: 'Kaca',
    emission_factor: 8.98311,
    source: 'Defra. Other: Glass (Landfill)',
    unit: 'tonne'
  },
  {
    name: 'Makanan dan Minuman',
    emission_factor: 700.30886,
    source: 'DEFRA. Refuse (Organic: food and drink waste. Landfill)',
    unit: 'tonne'
  },
  {
    name: 'Metal',
    emission_factor: 8.98311,
    source: 'DEFRA. Metal (Metal: mixed cans, Landfill)',
    unit: 'tonne'
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
      CREATE TABLE IF NOT EXISTS faktor_emisi_limbah (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        emission_factor NUMERIC(12,5) NOT NULL,
        emission_factor_name TEXT NOT NULL,
        source TEXT,
        unit TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS faktor_emisi_limbah_name_idx
      ON faktor_emisi_limbah(name)
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE faktor_emisi_limbah
      SET name = 'Makanan dan Minuman', updated_at = NOW()
      WHERE name = 'Food and Drink'
        AND NOT EXISTS (
          SELECT 1 FROM faktor_emisi_limbah WHERE name = 'Makanan dan Minuman'
        )
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM faktor_emisi_limbah
      WHERE name = 'Food and Drink'
        AND EXISTS (
          SELECT 1 FROM faktor_emisi_limbah WHERE name = 'Makanan dan Minuman'
        )
    `);

    for (const item of WASTE_FACTORS) {
      await prisma.$executeRaw`
        INSERT INTO faktor_emisi_limbah (
          name,
          emission_factor,
          emission_factor_name,
          source,
          unit,
          created_at,
          updated_at
        )
        VALUES (
          ${item.name},
          ${item.emission_factor},
          ${'kg CO2e/tonne'},
          ${item.source},
          ${item.unit},
          NOW(),
          NOW()
        )
        ON CONFLICT (name) DO UPDATE SET
          emission_factor = EXCLUDED.emission_factor,
          emission_factor_name = EXCLUDED.emission_factor_name,
          source = EXCLUDED.source,
          unit = EXCLUDED.unit,
          updated_at = NOW()
      `;
    }

    console.log(`✅ Seed faktor emisi limbah selesai: ${WASTE_FACTORS.length} data`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Gagal seed faktor emisi limbah:', error);
  process.exit(1);
});
