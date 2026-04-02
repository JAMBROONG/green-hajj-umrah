import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function resetData() {
  try {
    console.log('🔄 Starting data reset...\n')

    // 1. Reset Carbon Certificate Purchases (pembelian carbon)
    console.log('🗑️  Deleting carbon purchases...')
    const deletedPurchases = await prisma.carbon_certificate_purchases.deleteMany({})
    console.log(`✅ Deleted ${deletedPurchases.count} purchases\n`)

    // 2. Reset Journey Data (semua activities: food, waste, transport, hotel)
    console.log('🗑️  Deleting journey data (activities)...')
    const deletedJourneys = await prisma.journey_data.deleteMany({})
    console.log(`✅ Deleted ${deletedJourneys.count} journey activities\n`)

    // 3. Reset Trips (perjalanan) - will cascade delete journey_data
    console.log('🗑️  Deleting trips...')
    const deletedTrips = await prisma.trips.deleteMany({})
    console.log(`✅ Deleted ${deletedTrips.count} trips\n`)

    // 4. Reset CSR Participations (tapi keep CSR activities)
    console.log('🗑️  Deleting CSR participations...')
    const deletedParticipations = await prisma.csr_activity_participations.deleteMany({})
    console.log(`✅ Deleted ${deletedParticipations.count} CSR participations\n`)

    console.log('='.repeat(50))
    console.log('✨ Data reset completed successfully!')
    console.log('='.repeat(50))
    console.log('\n📊 Master data preserved:')
    console.log('  ✅ Tenants')
    console.log('  ✅ User profiles')
    console.log('  ✅ Carbon products')
    console.log('  ✅ Hotels')
    console.log('  ✅ CSR activities')
    console.log('  ✅ Payment configurations')
    console.log('  ✅ Emission factors\n')
  } catch (error) {
    console.error('❌ Error during reset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetData()
