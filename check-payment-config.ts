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
    const configs = await prisma.TenantPaymentConfig.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('\n📋 Payment Configs in Database:\n');
    configs.forEach((config) => {
      console.log(`Tenant: ${config.tenant.name}`);
      console.log(`  Server Key: ${config.midtrans_server_key.substring(0, 20)}...`);
      console.log(`  Client Key: ${config.midtrans_client_key.substring(0, 20)}...`);
      console.log(`  Merchant ID: ${config.midtrans_merchant_id}`);
      console.log(`  Enabled: ${config.enabled}`);
      console.log('');
    });

    console.log('\n🔑 Environment Variables:\n');
    console.log(`  MIDTRANS_SERVER_KEY: ${process.env.MIDTRANS_SERVER_KEY?.substring(0, 20) || 'NOT SET'}...`);
    console.log(`  MIDTRANS_CLIENT_KEY: ${process.env.MIDTRANS_CLIENT_KEY?.substring(0, 20) || 'NOT SET'}...`);
    console.log(`  MIDTRANS_MERCHANT_ID: ${process.env.MIDTRANS_MERCHANT_ID || 'NOT SET'}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();