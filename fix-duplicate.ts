import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  console.log('🗑️  Deleting duplicate Mobil Listrik (id: 10) with type "mobil"...');
  const deleted = await prisma.jenis_kendaraan.delete({
    where: { id: 10 }
  });
  console.log('✅ Deleted:', deleted.name, '(type:', deleted.type + ')');

  console.log('\n📊 Final vehicle factors:');
  const all = await prisma.jenis_kendaraan.findMany({
    orderBy: { type: 'asc' }
  });
  
  const factors: Record<string, number> = {};
  all.forEach(v => {
    factors[v.type] = parseFloat(v.emission_factor?.toString() || '0');
    console.log(`  ${v.type}: ${v.name} = ${v.emission_factor}`);
  });

  console.log('\n✅ Final factors object:');
  console.log(JSON.stringify(factors, null, 2));

  await prisma.$disconnect();
}

fix().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
