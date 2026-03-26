import prisma from '@/lib/prisma'

async function seedPaymentConfig() {
  // Get default tenant
  const defaultTenant = await prisma.tenants.findUnique({
    where: { slug: 'default' },
  })

  if (!defaultTenant) {
    console.log('❌ Default tenant not found')
    return
  }

  // Check if config already exists
  const existingConfig = await prisma.TenantPaymentConfig.findUnique({
    where: { tenant_id: defaultTenant.id },
  })

  if (existingConfig) {
    console.log('✅ Payment config already exists for default tenant')
    return
  }

  // Create config from .env
  const config = await prisma.TenantPaymentConfig.create({
    data: {
      tenant_id: defaultTenant.id,
      midtrans_server_key: process.env.MIDTRANS_SERVER_KEY!,
      midtrans_client_key: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
      midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID!,
      is_production: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    },
  })

  console.log('✅ Payment config seeded:', config)
}

seedPaymentConfig()
  .catch((e) => {
    console.error('❌ Error seeding payment config:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
