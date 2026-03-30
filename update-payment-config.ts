import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load from explicit path
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const serverKey = 'Mid-server-KH4EicmFlyZA6EBWuCwuK93o';
  const clientKey = 'Mid-client-8BJEkiPcyzmBYPA2';
  const merchantId = 'G000566228';

  try {
    console.log('\n🔄 Updating Payment Configs...\n');

    const updated = await prisma.TenantPaymentConfig.updateMany({
      data: {
        midtrans_server_key: serverKey,
        midtrans_client_key: clientKey,
        midtrans_merchant_id: merchantId,
      },
    });

    console.log(`✅ Updated ${updated.count} payment config(s)`);

    // Verify
    const configs = await prisma.TenantPaymentConfig.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('\n📋 Updated Payment Configs:\n');
    configs.forEach((config) => {
      console.log(`Tenant: ${config.tenant.name}`);
      console.log(`  Server Key: ${config.midtrans_server_key}`);
      console.log(`  Client Key: ${config.midtrans_client_key}`);
      console.log(`  Merchant ID: ${config.midtrans_merchant_id}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
