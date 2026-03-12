import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHajjPeriods() {
  console.log('🌱 Seeding hajj periods...');

  const hajjPeriods = [
    {
      year: 2026,
      start_date: new Date('2026-05-24'),
      end_date: new Date('2026-05-29'),
      registration_open_date: new Date('2026-03-24'), // 2 months before
      registration_close_date: new Date('2026-06-29'), // 1 month after
      is_active: true
    },
    {
      year: 2027,
      start_date: new Date('2027-05-13'),
      end_date: new Date('2027-05-18'),
      registration_open_date: new Date('2027-03-13'),
      registration_close_date: new Date('2027-06-18'),
      is_active: true
    },
    {
      year: 2028,
      start_date: new Date('2028-05-02'),
      end_date: new Date('2028-05-07'),
      registration_open_date: new Date('2028-03-02'),
      registration_close_date: new Date('2028-06-07'),
      is_active: true
    }
  ];

  for (const period of hajjPeriods) {
    const existing = await prisma.hajj_periods.findUnique({
      where: { year: period.year }
    });

    if (existing) {
      console.log(`  ℹ️  Hajj period ${period.year} already exists, skipping...`);
    } else {
      await prisma.hajj_periods.create({
        data: period
      });
      console.log(`  ✅ Created hajj period for ${period.year}`);
    }
  }

  console.log('✨ Hajj periods seeding completed!');
}

async function main() {
  try {
    await seedHajjPeriods();
  } catch (error) {
    console.error('❌ Error seeding hajj periods:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
