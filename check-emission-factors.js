const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('📊 Checking jenis_kendaraan table...\n');
    
    const vehicles = await prisma.jenis_kendaraan.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        emission_factor: true,
      },
    });

    if (vehicles.length === 0) {
      console.log('❌ No data found in jenis_kendaraan table!');
      console.log('Need to seed database first.');
      return;
    }

    console.log(`✅ Found ${vehicles.length} vehicle types:\n`);
    vehicles.forEach((v) => {
      console.log(`  type: "${v.type}"`);
      console.log(`  name: ${v.name}`);
      console.log(`  emission_factor: ${v.emission_factor}`);
      console.log('');
    });

    // Show what the API would return
    const factorsMap = vehicles.reduce((acc, v) => {
      acc[v.type] = parseFloat(v.emission_factor.toString());
      return acc;
    }, {});

    console.log('📡 API would return factors object:');
    console.log(JSON.stringify(factorsMap, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
