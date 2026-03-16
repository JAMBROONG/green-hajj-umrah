import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const FOOD_FACTORS = [
  { name: 'Makanan vegan', emission_factor: 0.39 },
  { name: 'Makanan vegetarian', emission_factor: 0.51 },
  { name: 'Makan dengan ikan berlemak', emission_factor: 1.11 },
  { name: 'Makan dengan ayam', emission_factor: 1.58 },
  { name: 'Makan dengan ikan putih', emission_factor: 1.98 },
  { name: 'Makan dengan daging sapi', emission_factor: 7.26 }
];

type FaktorEmisiMakananDelegate = {
  upsert: (args: {
    where: { name: string };
    update: { emission_factor: number; emission_factor_name: string };
    create: { name: string; emission_factor: number; emission_factor_name: string };
  }) => Promise<unknown>;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const faktorEmisiMakanan = (prisma as unknown as { faktor_emisi_makanan: FaktorEmisiMakananDelegate }).faktor_emisi_makanan;

  try {
    for (const item of FOOD_FACTORS) {
      await faktorEmisiMakanan.upsert({
        where: { name: item.name },
        update: {
          emission_factor: item.emission_factor,
          emission_factor_name: 'kg CO2e/porsi'
        },
        create: {
          name: item.name,
          emission_factor: item.emission_factor,
          emission_factor_name: 'kg CO2e/porsi'
        }
      });
    }

    console.log(`✅ Seed faktor emisi makanan selesai: ${FOOD_FACTORS.length} data`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Gagal seed faktor emisi makanan:', error);
  process.exit(1);
});
