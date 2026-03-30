import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CARBON_PRODUCTS = [
  {
    product_code: 'GOLD-001',
    name: 'Gold Standard Forest Carbon',
    description: 'Premium forest conservation credits from verified reforestation projects',
    price: 150000,
    project: 'Indonesia Forest Conservation Initiative',
    category: 'reforestation',
    image_url: '/carbon/gold-forest.jpg',
    color_class: 'bg-yellow-100',
  },
  {
    product_code: 'BLUE-001',
    name: 'Blue Carbon - Mangrove Protection',
    description: 'Coastal mangrove restoration and protection credits',
    price: 175000,
    project: 'Mangrove Restoration Program',
    category: 'mangrove',
    image_url: '/carbon/blue-mangrove.jpg',
    color_class: 'bg-blue-100',
  },
  {
    product_code: 'GREEN-001',
    name: 'Green Energy Transition Credits',
    description: 'Solar and renewable energy project offsets',
    price: 120000,
    project: 'Southeast Asia Renewable Energy',
    category: 'renewable_energy',
    image_url: '/carbon/green-energy.jpg',
    color_class: 'bg-green-100',
  },
  {
    product_code: 'WATER-001',
    name: 'Water Conservation Credits',
    description: 'Clean water and agriculture offset credits',
    price: 100000,
    project: 'Agricultural Water Management',
    category: 'water_conservation',
    image_url: '/carbon/water-conservation.jpg',
    color_class: 'bg-cyan-100',
  },
  {
    product_code: 'AGRI-001',
    name: 'Sustainable Agriculture Offsets',
    description: 'Regenerative farming and soil carbon credits',
    price: 130000,
    project: 'Regenerative Agriculture Network',
    category: 'agriculture',
    image_url: '/carbon/sustainable-agri.jpg',
    color_class: 'bg-amber-100',
  },
  {
    product_code: 'METHANE-001',
    name: 'Methane Reduction Credits',
    description: 'Landfill and livestock methane capture projects',
    price: 90000,
    project: 'Methane Emissions Reduction',
    category: 'methane_reduction',
    image_url: '/carbon/methane-reduction.jpg',
    color_class: 'bg-purple-100',
  },
];

async function main() {
  console.log('🌱 Seeding carbon products...\n');

  try {
    let createdCount = 0;

    for (const product of CARBON_PRODUCTS) {
      const created = await prisma.carbon_products.upsert({
        where: { product_code: product.product_code },
        update: {},
        create: {
          ...product,
          is_active: true,
        },
      });

      console.log(`✅ Created: ${created.name}`);
      createdCount++;
    }

    console.log(`\n🎉 Successfully seeded ${createdCount} carbon products!`);
  } catch (error) {
    console.error('❌ Error seeding carbon products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
