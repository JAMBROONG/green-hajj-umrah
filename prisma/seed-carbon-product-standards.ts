import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/green_hajj_umrah';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const standards = [
  { series: 'IDNBS', name: 'Indonesia Nature Based Solution', vintage: '2014 - 2024', price: 100000.00 },
  { series: 'IDNBSA', name: 'Indonesia Nature Based Solution Authorized', vintage: '2014 - 2024', price: 115000.00 },
  { series: 'IDNBSI', name: 'Indonesia Nature Based Solution International Standard', vintage: '2014 - 2024', price: 120000.00 },
  { series: 'IDTBS', name: 'Indonesia Technology Based Solution', vintage: '2014 - 2024', price: 150000.00 },
  { series: 'IDTBS-RE', name: 'Indonesia Technology Based Solution Renewable Energy', vintage: '2014 - 2024', price: 160000.00 },
  { series: 'IDTBSA', name: 'Indonesia Technology Based Solution Authorized', vintage: '2014 - 2024', price: 170000.00 },
  { series: 'IDTBSA-RE', name: 'Indonesia Technology Based Solution Authorized Renewable Energy', vintage: '2014 - 2024', price: 180000.00 },
  { series: 'IDTBSI', name: 'Indonesia Technology Based Solution International Standard', vintage: '2014 - 2024', price: 190000.00 },
];

async function main() {
  console.log('Seeding carbon product standards...');
  
  for (const standard of standards) {
    const result = await prisma.carbon_product_standards.upsert({
      where: { series: standard.series },
      update: standard,
      create: standard,
    });
    console.log(`✅ Seeding ${result.series}`);
  }
  
  console.log('✅ Seeding carbon product standards done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });