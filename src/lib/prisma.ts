import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public'

const prismaClientSingleton = () => {
  try {
    const connectionString = process.env.DATABASE_URL || DEFAULT_DEV_DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables')
    }
    
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
  } catch (error) {
    console.error('Failed to initialize Prisma Client:', error)
    throw error
  }
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
