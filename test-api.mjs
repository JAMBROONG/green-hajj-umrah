import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('Testing Prisma client...');
console.log('Available models on prisma:', Object.keys(prisma).filter(k => !k.startsWith('$')).slice(0, 10));

try {
  const count = await prisma.csr_activities.count();
  console.log('✅ CSR Activities count:', count);
  
  const first = await prisma.csr_activities.findFirst();
  console.log('✅ First activity:', first?.title);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Available properties:', Object.keys(prisma).filter(k => !k.startsWith('$')));
}

await prisma.$disconnect();
