import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🗑️  Deleting old vehicle types (land, airplane, sea)...');
    const deleted = await prisma.jenis_kendaraan.deleteMany({
      where: {
        type: {
          in: ['land', 'airplane', 'sea']
        }
      }
    });
    console.log('✅ Deleted:', deleted.count, 'old records');

    console.log('\n📊 Remaining vehicles:');
    const remaining = await prisma.jenis_kendaraan.findMany({
      select: { id: true, name: true, type: true, emission_factor: true },
      orderBy: { type: 'asc' }
    });
    
    remaining.forEach(v => {
      console.log(`  ${v.type}: ${v.name} (${v.emission_factor})`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

cleanup().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
