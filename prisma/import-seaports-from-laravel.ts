import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';

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

const SEAPORTS_JSON_PATH = path.join(__dirname, '../public/seaports.json');

function loadSeaportsFromJson(): ParsedSeaport[] {
  const content = readFileSync(SEAPORTS_JSON_PATH, 'utf-8');
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error('JSON harus berupa array seaports');
  }

  return data.map((item) => ({
    source_id: item.source_id,
    name: item.name,
    alias_name: item.alias_name || null,
    latitude: item.latitude,
    longitude: item.longitude,
    province: item.province || null,
    city: item.city || null,
    address: item.address || null,
    country_id: item.country_id || null,
    country_code: item.country_code || 'ID'
  } satisfies ParsedSeaport));
}

async function main() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DEV_DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL belum diset.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const seaports = loadSeaportsFromJson();

    if (!seaports.length) {
      throw new Error('Tidak ada data pelabuhan di file public/seaports.json');
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

    console.log(`✅ Import seaports selesai: ${seaports.length} data dari ${SEAPORTS_JSON_PATH}`);
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
