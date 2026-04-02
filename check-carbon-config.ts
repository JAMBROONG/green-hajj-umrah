import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const config = await prisma.carbonPaymentConfig.findFirst()
  
  if (!config) {
    console.log('❌ No carbon config found')
    return
  }
  
  console.log('\n✅ Carbon Payment Config:')
  console.log('Merchant ID:', config.midtrans_merchant_id)
  console.log('Client Key:', config.midtrans_client_key)
  console.log('Server Key:', config.midtrans_server_key)
  console.log('Is Production:', config.is_production)
  console.log('Enabled:', config.enabled)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
