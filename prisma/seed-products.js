const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';

const connectionString = process.env.DATABASE_URL || DEFAULT_DEV_DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // Create sample carbon products
    const products = [
      {
        id: 'cp-001',
        product_code: 'CP001',
        name: 'Tree Planting Package - Small',
        description: 'Plant 10 trees and offset 1 ton of CO2',
        price: '100000.00',
        project: 'Reforestation Initiative',
        category: 'reforestation',
        image_url: 'https://via.placeholder.com/300?text=Trees',
        is_active: true,
      },
      {
        id: 'cp-002',
        product_code: 'CP002',
        name: 'Tree Planting Package - Medium',
        description: 'Plant 25 trees and offset 2.5 tons of CO2',
        price: '250000.00',
        project: 'Reforestation Initiative',
        category: 'reforestation',
        image_url: 'https://via.placeholder.com/300?text=More+Trees',
        is_active: true,
      },
      {
        id: 'cp-003',
        product_code: 'CP003',
        name: 'Solar Panel Installation',
        description: 'Support solar panel installation offsetting 5 tons of CO2 annually',
        price: '500000.00',
        project: 'Renewable Energy Program',
        category: 'renewable_energy',
        image_url: 'https://via.placeholder.com/300?text=Solar',
        is_active: true,
      },
      {
        id: 'cp-004',
        product_code: 'CP004',
        name: 'Waste Management Program',
        description: 'Support waste reduction initiatives offsetting 2 tons of CO2',
        price: '150000.00',
        project: 'Circular Economy Project',
        category: 'waste_reduction',
        image_url: 'https://via.placeholder.com/300?text=Recycling',
        is_active: true,
      },
    ];

    for (const product of products) {
      try {
        const existing = await prisma.carbon_products.findUnique({
          where: { id: product.id }
        });
        
        if (!existing) {
          await prisma.carbon_products.create({
            data: product
          });
          console.log(`✓ Created carbon product: ${product.name}`);
        } else {
          console.log(`✓ Carbon product already exists: ${product.name}`);
        }
      } catch (e) {
        console.error(`✗ Error creating product ${product.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
