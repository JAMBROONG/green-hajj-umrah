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
    console.log('🗑️  Clearing jenis_kendaraan table...');
    await prisma.jenis_kendaraan.deleteMany({});
    console.log('✅ Cleared!');

    const vehicles = [
      { name: 'Mobil', type: 'mobil', emission_factor: 0.16725, emission_factor_name: 'kg CO2e/km' },
      { name: 'Mobil Listrik', type: 'mobil-listrik', emission_factor: 0, emission_factor_name: 'kg CO2e/km' },
      { name: 'Bus', type: 'bus', emission_factor: 0.10385, emission_factor_name: 'kg CO2e/km' },
      { name: 'Bus Listrik', type: 'bus-listrik', emission_factor: 0, emission_factor_name: 'kg CO2e/km' },
      { name: 'Kereta', type: 'kereta', emission_factor: 0.03546, emission_factor_name: 'kg CO2e/km' },
      { name: 'Pesawat Ekonomi', type: 'pesawat-ekonomi', emission_factor: 0.10916, emission_factor_name: 'kg CO2e/km' },
      { name: 'Pesawat Bisnis', type: 'pesawat-bisnis', emission_factor: 0.43663, emission_factor_name: 'kg CO2e/km' },
      { name: 'Kapal', type: 'kapal', emission_factor: 0.1127, emission_factor_name: 'kg CO2e/km' }
    ];

    console.log('📝 Seeding fresh data...');
    for (const v of vehicles) {
      await prisma.jenis_kendaraan.create({
        data: v
      });
    }
    console.log(`✅ Seeded ${vehicles.length} vehicles`);

    console.log('\n🎯 Final data:');
    const all = await prisma.jenis_kendaraan.findMany();
    const factors: Record<string, number> = {};
    all.forEach(v => {
      factors[v.type] = parseFloat(v.emission_factor?.toString() || '0');
      console.log(`  ${v.type.padEnd(18)} → ${v.name.padEnd(20)} = ${v.emission_factor}`);
    });

    console.log('\n✨ Factors map:');
    console.log(JSON.stringify(factors, null, 2));

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
