import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('🗑️  Clearing hotels and hotel_emission tables...');
    await prisma.hotels.deleteMany({});
    await prisma.hotel_emission.deleteMany({});
    console.log('✅ Cleared!');

    // Get tenant IDs
    const bpkh = await prisma.tenants.findUnique({
      where: { slug: 'bpkh' },
    });
    const alHidayah = await prisma.tenants.findUnique({
      where: { slug: 'al-hidayah' },
    });

    console.log(`�, Found tenants: BPKH=${bpkh?.id}, Al-Hidayah=${alHidayah?.id}`);

    // Create hotel emission factors by country
    console.log('📝 Creating hotel emission factors by country...');
    const emissionFactorsData = [
      { country: 'SA', emission_factor: 50.0 }, // Saudi Arabia - 5 star
      { country: 'SA', emission_factor: 35.0 }, // Saudi Arabia - 4 star
      { country: 'SA', emission_factor: 25.0 }, // Saudi Arabia - 3 star
      { country: 'ID', emission_factor: 25.0 }, // Indonesia
      { country: 'AE', emission_factor: 45.0 }, // UAE
      { country: 'TR', emission_factor: 30.0 }, // Turkey
      { country: 'EG', emission_factor: 28.0 }, // Egypt
    ];

    const createdEmissions = await Promise.all(
      emissionFactorsData.map((factor) =>
        prisma.hotel_emission.create({
          data: factor,
        })
      )
    );

    console.log(`✅ Created ${createdEmissions.length} emission factor records`);

    // Map country and rating to emission factor ID
    const emissionFactorMap: Record<string, number> = {};
    let saCounterFive = 0;
    let saCounterFour = 0;
    let saCounterThree = 0;

    createdEmissions.forEach((factor) => {
      // Convert Decimal to string and then to number for comparison
      const emissionValue = parseFloat(String(factor.emission_factor));
      
      if (factor.country === 'SA' && emissionValue === 50) {
        emissionFactorMap['SA-5'] = factor.id;
      } else if (factor.country === 'SA' && emissionValue === 35) {
        emissionFactorMap['SA-4'] = factor.id;
      } else if (factor.country === 'SA' && emissionValue === 25) {
        emissionFactorMap['SA-3'] = factor.id;
      } else if (factor.country === 'ID') {
        emissionFactorMap['ID'] = factor.id;
      } else if (factor.country === 'AE') {
        emissionFactorMap['AE'] = factor.id;
      } else if (factor.country === 'TR') {
        emissionFactorMap['TR'] = factor.id;
      } else if (factor.country === 'EG') {
        emissionFactorMap['EG'] = factor.id;
      }
    });

    // Create hotels with references to emission factors
    console.log('📝 Seeding hotel data...');

    const hotelsData = [
      // Madinah Hotels (5-star)
      { name: 'Hilton Madinah', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'Mövenpick Hotel Madinah', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'The Oberoi Madinah', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'InterContinental Dar Al Iman', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'Pullman ZamZam Madinah', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      // Madinah Hotels (4-star)
      { name: 'Anwar Al Madinah Mövenpick', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-4' },
      { name: 'Dar Al Taqwa Hotel', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-4' },
      { name: 'Al Haram Hotel', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-4' },
      // Madinah Hotels (3-star)
      { name: 'Elaf Al Mashaer Hotel', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-3' },
      { name: 'Al Aqeeq Hotel', address: 'Madinah, Saudi Arabia', country: 'SA', ratingKey: 'SA-3' },
      // Makkah Hotels (5-star)
      { name: 'Fairmont Makkah Clock Royal Tower', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'Swissôtel Makkah', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'Raffles Makkah Palace', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'Conrad Makkah', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      { name: 'Anjum Hotel Makkah', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-5' },
      // Makkah Hotels (4-star)
      { name: 'Dar Al Tawhid Intercontinental', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-4' },
      { name: 'Elaf Kinda Hotel', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-4' },
      { name: 'Al Safwah Royale Orchid', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-4' },
      // Makkah Hotels (3-star)
      { name: 'Al Marwa Rayhaan by Rotana', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-3' },
      { name: 'Makarem Ajyad Makkah', address: 'Makkah, Saudi Arabia', country: 'SA', ratingKey: 'SA-3' },
      // Indonesia Asrama/Hotels (3-star)
      { name: 'Asrama Haji Jakarta', address: 'Jakarta, Indonesia', country: 'ID', ratingKey: 'ID' },
      { name: 'Asrama Haji Surabaya', address: 'Surabaya, Indonesia', country: 'ID', ratingKey: 'ID' },
      { name: 'Pondok Gede Haji', address: 'Jakarta, Indonesia', country: 'ID', ratingKey: 'ID' },
    ];

    for (const hotel of hotelsData) {
      // Assign hotels to tenants
      let tenant_id = null;
      if (hotel.country === 'SA') {
        tenant_id = bpkh?.id; // Saudi Arabia hotels to BPKH
      } else if (hotel.country === 'ID') {
        tenant_id = alHidayah?.id; // Indonesia hotels to Al-Hidayah
      }

      await prisma.hotels.create({
        data: {
          name: hotel.name,
          address: hotel.address,
          country: hotel.country,
          tenant_id: tenant_id,
          hotel_emission_id: emissionFactorMap[hotel.ratingKey],
        },
      });
    }

    console.log(`✅ Seeded ${hotelsData.length} hotels`);

    console.log('\n🎯 Final data:');
    const allHotels = await prisma.hotels.findMany({
      include: {
        hotel_emission: true,
      },
    });

    const hotelsByCountry: Record<string, any[]> = {};
    allHotels.forEach((h) => {
      if (!hotelsByCountry[h.country]) {
        hotelsByCountry[h.country] = [];
      }
      hotelsByCountry[h.country].push(h);
    });

    Object.entries(hotelsByCountry).forEach(([country, hotels]) => {
      console.log(`\n  ${country}:`);
      hotels.forEach((h) => {
        console.log(`    - ${h.name} (Emission Factor: ${h.hotel_emission?.emission_factor} kg CO2e)`);
      });
    });

    console.log('\n✨ Hotel emission factors:');
    const allEmissions = await prisma.hotel_emission.findMany();
    const emissionsByCountry: Record<string, (number | any)[]> = {};
    allEmissions.forEach((e: any) => {
      if (!emissionsByCountry[e.country]) {
        emissionsByCountry[e.country] = [];
      }
      emissionsByCountry[e.country].push(e.emission_factor);
    });

    Object.entries(emissionsByCountry).forEach(([country, factors]) => {
      console.log(`  ${country}: ${Array.from(new Set(factors.map(f => f.toString()))).join(', ')} kg CO2e`);
    });

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
