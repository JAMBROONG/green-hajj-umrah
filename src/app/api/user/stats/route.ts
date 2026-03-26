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
        type: 'participate',
      },
    })

    // Get certificate count
    const certCount = await prisma.carbon_certificate_purchases.count({
      where: { user_id: user.id },
    })

    // Calculate total CO2
    const trips = await prisma.trips.findMany({
      where: { user_id: user.id },
      include: {
        emissions: true,
      },
    })

    const totalCO2Emitted = trips.reduce((sum, trip) => {
      const tripEmissions = trip.emissions?.reduce((t, e) => t + parseFloat(e.co2_emitted || '0'), 0) || 0
      return sum + tripEmissions
    }, 0)

    const certs = await prisma.carbon_certificate_purchases.findMany({
      where: { user_id: user.id },
    })

    const totalCO2Offset = certs.reduce((sum, cert) => {
      return sum + parseFloat(cert.co2_equivalent.toString() || '0')
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
