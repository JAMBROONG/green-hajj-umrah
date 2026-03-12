import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Prisma client object keys:');
    const keys = Object.keys(prisma);
    keys.forEach(k => {
      if (!k.startsWith('_') && !k.startsWith('$')) {
        console.log(`  - ${k}`);
      }
    });
    
    console.log('\n Checking specific models:');
    console.log('  - prisma.tenants:', typeof prisma.tenants);
    console.log('  - prisma.trips:', typeof prisma.trips);
    console.log('  - prisma.profiles:', typeof prisma.profiles);
    console.log('  - prisma.hajjPeriods:', typeof prisma.hajjPeriods);
    console.log('  - prisma.hajj_periods:', typeof prisma.hajj_periods);
    console.log('  - prisma.journeyData:', typeof prisma.journeyData);
    console.log('  - prisma.journey_data:', typeof prisma.journey_data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
