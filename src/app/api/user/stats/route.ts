import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.profiles.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get trip count
    const tripCount = await prisma.trips.count({
      where: { user_id: user.id },
    })

    // Get CSR donations count
    const csrCount = await prisma.csr_activity_participations.count({
      where: { 
        user_id: user.id,
        type: 'donate',
      },
    })

    // Get certificate count (only active)
    const certCount = await prisma.carbon_certificate_purchases.count({
      where: { user_id: user.id },
    })

    // Calculate total CO2
    const trips = await prisma.trips.findMany({
      where: { user_id: user.id },
    })

    const totalCO2Emitted = trips.reduce((sum, trip) => {
      return sum + parseFloat(trip.total_emission.toString() || '0')
    }, 0)

    // Only count completed/confirmed purchases for offset.
    // co2_equivalent is stored in tCO₂e (= units), convert to kg (×1000)
    // so units are consistent with trip.total_emission which is in kg CO₂e.
    const certs = await prisma.carbon_certificate_purchases.findMany({
      where: {
        user_id: user.id,
        status: { in: ['completed', 'confirmed'] },
      },
    })

    const totalCO2Offset = certs.reduce((sum, cert) => {
      // co2_equivalent stored as tCO₂e → multiply by 1000 to get kg CO₂e
      return sum + parseFloat(cert.co2_equivalent.toString() || '0') * 1000
    }, 0)

    return NextResponse.json({
      totalTrips: tripCount,
      totalCSRDonations: csrCount,
      totalCertificates: certCount,
      totalCO2Emitted: Math.round(totalCO2Emitted * 100) / 100,
      totalCO2Offset: Math.round(totalCO2Offset * 100) / 100,
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
