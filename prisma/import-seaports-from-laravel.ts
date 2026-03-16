import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';

dotenv.config();

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';

type ParsedSeaport = {
  source_id: number;
  name: string;
  alias_name: string | null;
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
  address: string | null;
  country_id: number | null;
  country_code: string;
};

const INDONESIA_BOUNDS = {
  minLat: -11.5,
  maxLat: 6.5,
  minLon: 95,
  maxLon: 141.5
} as const;

function isWithinIndonesiaBounds(lat: number, lon: number): boolean {
  return (
    lat >= INDONESIA_BOUNDS.minLat &&
    lat <= INDONESIA_BOUNDS.maxLat &&
    lon >= INDONESIA_BOUNDS.minLon &&
    lon <= INDONESIA_BOUNDS.maxLon
  );
}

function normalizeString(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
  return cleaned.length ? cleaned : null;
}

function extractString(block: string, key: string): string | null {
  const match = block.match(new RegExp(`"${key}"\\s*=>\\s*"([\\s\\S]*?)"`));
  return normalizeString(match?.[1]);
}

function extractNumber(block: string, key: string): number | null {
  const match = block.match(new RegExp(`"${key}"\\s*=>\\s*([-+]?[0-9]*\\.?[0-9]+)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseSeaportsFromSeeder(content: string): ParsedSeaport[] {
  const itemBlocks = [...content.matchAll(/array\(\s*"id"\s*=>[\s\S]*?\),/g)].map((m) => m[0]);

  return itemBlocks
    .map((block) => {
      const source_id = extractNumber(block, 'id');
      const name = extractString(block, 'name');
      const latitude = extractNumber(block, 'latitude');
      const longitude = extractNumber(block, 'longitude');

      if (!source_id || !name || latitude === null || longitude === null) {
        return null;
      }

      return {
        source_id,
        name,
        alias_name: extractString(block, 'name2'),
        latitude,
        longitude,
        province: extractString(block, 'province'),
        city: extractString(block, 'city'),
        address: extractString(block, 'address'),
        country_id: extractNumber(block, 'country_id'),
        country_code: 'ID'
      } satisfies ParsedSeaport;
    })
    .filter((item): item is ParsedSeaport => Boolean(item));
}

async function main() {
  const seederPath = process.argv[2];

  if (!seederPath) {
    throw new Error('Path file seeder Laravel wajib diisi. Contoh: npm run db:import-seaports:laravel -- "/path/SeaportSeeder.php"');
  }

  if (!existsSync(seederPath)) {
    throw new Error(`File tidak ditemukan: ${seederPath}`);
  }

  const connectionString = process.env.DATABASE_URL || DEFAULT_DEV_DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL belum diset.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const content = readFileSync(seederPath, 'utf-8');
    const seaports = parseSeaportsFromSeeder(content);

    if (!seaports.length) {
      throw new Error('Tidak ada data pelabuhan yang berhasil diparse dari seeder Laravel.');
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS seaports (
        id SERIAL PRIMARY KEY,
        source_id INTEGER UNIQUE,
        name TEXT NOT NULL,
        alias_name TEXT,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        province TEXT,
        city TEXT,
        address TEXT,
        country_id INTEGER,
        country_code VARCHAR(10) NOT NULL DEFAULT 'ID',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS seaports_source_id_key ON seaports(source_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS seaports_name_idx ON seaports(name)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS seaports_country_code_idx ON seaports(country_code)
    `);

    let activeCount = 0;
    let inactiveCount = 0;

    for (const item of seaports) {
      const isActive = isWithinIndonesiaBounds(item.latitude, item.longitude);
      if (isActive) {
        activeCount += 1;
      } else {
        inactiveCount += 1;
      }

      await prisma.$executeRaw`
        INSERT INTO seaports (
          source_id,
          name,
          alias_name,
          latitude,
          longitude,
          province,
          city,
          address,
          country_id,
          country_code,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ${item.source_id},
          ${item.name},
          ${item.alias_name},
          ${item.latitude},
          ${item.longitude},
          ${item.province},
          ${item.city},
          ${item.address},
          ${item.country_id},
          ${item.country_code},
          ${isActive},
          NOW(),
          NOW()
        )
        ON CONFLICT (source_id) DO UPDATE SET
          name = EXCLUDED.name,
          alias_name = EXCLUDED.alias_name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          province = EXCLUDED.province,
          city = EXCLUDED.city,
          address = EXCLUDED.address,
          country_id = EXCLUDED.country_id,
          country_code = EXCLUDED.country_code,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;
    }

    console.log(`✅ Import seaports selesai: ${seaports.length} data dari ${seederPath}`);
    console.log(`ℹ️  Pelabuhan aktif (within Indonesia bounds): ${activeCount}`);
    console.log(`ℹ️  Pelabuhan nonaktif (out of bounds): ${inactiveCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Gagal import seaports dari seeder Laravel:', error);
  process.exit(1);
});
