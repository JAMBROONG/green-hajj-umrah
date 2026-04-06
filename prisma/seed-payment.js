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
    // Get the first tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.error('✗ No tenant found');
      process.exit(1);
    }

    // Check if payment config exists
    let paymentConfig = await prisma.tenantPaymentConfig.findUnique({
      where: { tenant_id: tenant.id }
    });

    if (!paymentConfig) {
      paymentConfig = await prisma.tenantPaymentConfig.create({
        data: {
          tenant_id: tenant.id,
          midtrans_server_key: 'SB-Mid-server-test123456',
          midtrans_merchant_id: 'M123456',
          midtrans_client_key: 'SB-Mid-client-test123456',
          is_production: false,
          enabled: true,
        },
      });
      console.log('✓ Created payment config');
    } else {
      console.log('✓ Payment config already exists');
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
