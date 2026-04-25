import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/emission-factors/vehicles
 * Get all vehicle emission factors from database
 */
export async function GET() {
  try {
    console.log('🔍 [API] Fetching vehicle emission factors...')
    
    const vehicles = await prisma.jenis_kendaraan.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        emission_factor: true,
      },
      orderBy: { name: 'asc' },
    })

    console.log(`📊 [API] Found ${vehicles.length} vehicles in database`)

    if (!vehicles || vehicles.length === 0) {
      console.warn('⚠️ [API] No vehicle emission factors found in database')
      return NextResponse.json(
        { 
          error: 'No vehicle data found',
          message: 'jenis_kendaraan table is empty. Please run seed script.'
        },
        { status: 404 }
      )
    }

    // Convert to object format for easier lookup
    const factorsMap = vehicles.reduce(
      (acc, vehicle) => {
        acc[vehicle.type] = parseFloat(vehicle.emission_factor?.toString() || '0')
        return acc
      },
      {} as Record<string, number>
    )

    console.log('✅ [API] Vehicle types:', Object.keys(factorsMap))
    console.log('✅ [API] Emission factors map:', factorsMap)

    return NextResponse.json({
      factors: factorsMap,
      vehicles: vehicles,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ [API] Error fetching emission factors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emission factors' },
      { status: 500 }
    )
  }
}
