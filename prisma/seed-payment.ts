import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Prisma with PG adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    // Get default tenant
    const defaultTenant = await prisma.tenants.findUnique({
      where: { slug: 'default' },
    })

    if (!defaultTenant) {
      console.log('❌ Default tenant not found')
      return
    }

    // Check if config already exists
    const existingConfig = await prisma.tenantPaymentConfig.findUnique({
      where: { tenant_id: defaultTenant.id },
    })

    if (existingConfig) {
      console.log('✅ Payment config already exists for default tenant')
      return
    }

    // Create config from .env
    const config = await prisma.tenantPaymentConfig.create({
      data: {
        tenant_id: defaultTenant.id,
        midtrans_server_key: process.env.MIDTRANS_SERVER_KEY!,
        midtrans_client_key: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
        midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID!,
        is_production: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      },
    })

    console.log('✅ Payment config seeded:', config)
  } catch (e) {
    console.error('❌ Error seeding payment config:', e)
    throw e
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
