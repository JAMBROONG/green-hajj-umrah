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
    // Get or create a tenant
    let tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      tenant = await prisma.tenants.create({
        data: {
          name: 'Test Organization',
          slug: 'test-org',
        },
      });
      console.log('✓ Created tenant:', tenant.id);
    } else {
      console.log('✓ Using existing tenant:', tenant.id);
    }

    // Create CSR activity
    try {
      const activity = await prisma.csr_activities.create({
        data: {
          id: 'csr-001',
          tenant_id: tenant.id,
          title: 'Penanaman Pohon Bersama',
          description: 'Program penanaman pohon untuk reboisasi area terbuka',
          category: 'reforestation',
          location: 'Jakarta Timur',
          status: 'active',
          start_date: new Date('2026-04-10'),
          end_date: new Date('2026-04-30'),
          activity_date: new Date('2026-04-20'),
          participants_count: 50,
          image_url: 'https://via.placeholder.com/300',
          contact_person: 'John Doe',
          contact_phone: '081234567890',
          contact_email: 'john@example.com',
        },
      });
      console.log('✓ Created CSR activity:', activity.id);
    } catch (e) {
      if (e.code === 'P2002') {
        console.log('✓ CSR activity already exists');
      } else {
        throw e;
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
