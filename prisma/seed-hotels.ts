import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const HOTELS = [
  // Madinah Hotels (5-star)
  { name: 'Hilton Madinah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'Mövenpick Hotel Madinah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'The Oberoi Madinah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'InterContinental Dar Al Iman', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'Pullman ZamZam Madinah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  // Madinah Hotels (4-star)
  { name: 'Anwar Al Madinah Mövenpick', factor_emission: 35, factor_emission_name: '4 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'Dar Al Taqwa Hotel', factor_emission: 35, factor_emission_name: '4 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'Al Haram Hotel', factor_emission: 35, factor_emission_name: '4 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  // Madinah Hotels (3-star)
  { name: 'Elaf Al Mashaer Hotel', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  { name: 'Al Aqeeq Hotel', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Madinah, Saudi Arabia', country_code: 'SA' },
  // Makkah Hotels (5-star)
  { name: 'Fairmont Makkah Clock Royal Tower', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Swissôtel Makkah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Raffles Makkah Palace', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Conrad Makkah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Anjum Hotel Makkah', factor_emission: 50, factor_emission_name: '5 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  // Makkah Hotels (4-star)
  { name: 'Dar Al Tawhid Intercontinental', factor_emission: 35, factor_emission_name: '4 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Elaf Kinda Hotel', factor_emission: 35, factor_emission_name: '4 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Al Safwah Royale Orchid', factor_emission: 35, factor_emission_name: '4 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  // Makkah Hotels (3-star)
  { name: 'Al Marwa Rayhaan by Rotana', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  { name: 'Makarem Ajyad Makkah', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Makkah, Saudi Arabia', country_code: 'SA' },
  // Indonesia Asrama/Hotels (3-star)
  { name: 'Asrama Haji Jakarta', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Jakarta, Indonesia', country_code: 'ID' },
  { name: 'Asrama Haji Surabaya', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Surabaya, Indonesia', country_code: 'ID' },
  { name: 'Pondok Gede Haji', factor_emission: 25, factor_emission_name: '3 Bintang', address: 'Jakarta, Indonesia', country_code: 'ID' },
];

async function main() {
  console.log('🌱 Seeding hotels...');

  try {
    for (const hotel of HOTELS) {
      const created = await prisma.hotels.create({
        data: hotel,
      });
      console.log(`✅ Created hotel: ${created.name}`);
    }
    console.log(`✅ Total ${HOTELS.length} hotels seeded!`);
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
