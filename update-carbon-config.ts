import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    // Find existing config
    const existingConfig = await prisma.carbonPaymentConfig.findFirst()

    if (existingConfig) {
      // Update existing
      const updated = await prisma.carbonPaymentConfig.update({
        where: { id: existingConfig.id },
        data: {
          midtrans_merchant_id: 'G454324030',
          midtrans_client_key: 'Mid-client-RKsqgPDSSn86BM5O',
          midtrans_server_key: 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
          is_production: true,
          enabled: true,
        },
      })

      console.log('\n✅ Updated Carbon Payment Config:')
      console.log('Merchant ID:', updated.midtrans_merchant_id)
      console.log('Client Key:', updated.midtrans_client_key)
      console.log('Server Key:', updated.midtrans_server_key)
      console.log('Is Production:', updated.is_production)
    } else {
      // Create if doesn't exist
      const created = await prisma.carbonPaymentConfig.create({
        data: {
          midtrans_merchant_id: 'G454324030',
          midtrans_client_key: 'Mid-client-RKsqgPDSSn86BM5O',
          midtrans_server_key: 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
          is_production: true,
          enabled: true,
        },
      })

      console.log('\n✅ Created Carbon Payment Config:')
      console.log('Merchant ID:', created.midtrans_merchant_id)
      console.log('Client Key:', created.midtrans_client_key)
      console.log('Server Key:', created.midtrans_server_key)
      console.log('Is Production:', created.is_production)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
