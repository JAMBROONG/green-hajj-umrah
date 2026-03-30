import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const products = await prisma.carbon_products.findMany({
      take: 20,
    });

    console.log('\n📦 Carbon Products in Database:\n');
    
    if (products.length === 0) {
      console.log('❌ Tidak ada data carbon products');
      console.log('\nPerlu seed data terlebih dahulu!');
    } else {
      console.log(`✅ Found ${products.length} carbon products:\n`);
      products.forEach((product) => {
        console.log(`ID: ${product.id}`);
        console.log(`  Name: ${product.name}`);
        console.log(`  Code: ${product.product_code}`);
        console.log(`  Price: Rp ${product.price}`);
        console.log(`  Project: ${product.project}`);
        console.log(`  Active: ${product.is_active}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
