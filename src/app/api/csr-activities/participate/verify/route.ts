import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateCSRCertificate } from '@/lib/csr-certificate-generator'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Verify CSR donation payment status and update if successful
 * POST /api/csr-activities/participate/verify
 */
export async function POST(request: NextRequest) {
  let participationId = 'unknown'
  try {
    console.log('🔍 [Verify] Request received')

    const appBaseUrl = (
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(request.url).origin
    ).replace(/\/$/, '')
    
    const session = await auth()
    console.log('🔐 [Verify] Session check:', !!session)
    
    if (!session || !session.user) {
      console.error('❌ [Verify] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 [Verify] User email:', session.user.email)

    const body = await request.json()
    participationId = body.participationId || 'missing'

    console.log('📝 [Verify] Called with:', { participationId, userEmail: session.user.email })

    if (!participationId || participationId === 'missing') {
      console.error('❌ [Verify] Missing participationId')
      return NextResponse.json(
        { error: 'Participation ID required' },
        { status: 400 }
      )
    }

    // Get donation record
    const donation = await prisma.csr_activity_participations.findUnique({
      where: { id: participationId },
      include: { user: true },
    })

    console.log('📦 [Verify] Donation Record:', {
      found: !!donation,
      id: donation?.id,
      status: donation?.status,
      userId: donation?.user_id,
      amount: donation?.amount,
    })

    if (!donation) {
      console.error('❌ [Verify] Donation not found:', participationId)
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      )
    }

    // If already confirmed, just return
    if (donation.status === 'confirmed') {
      console.log('ℹ️ [Verify] Donation already confirmed')
      return NextResponse.json({
        status: 'confirmed',
        message: 'Donation already confirmed',
        amount: donation.amount,
        activityId: donation.csr_activity_id,
      })
    }

    // Only process if pending
    if (donation.status !== 'pending') {
      console.log('ℹ️ [Verify] Donation status is:', donation.status)
      return NextResponse.json({
        status: donation.status,
        message: 'Donation already processed',
        amount: donation.amount,
        activityId: donation.csr_activity_id,
      })
    }

    // Get Activity
    const activity = await prisma.csr_activities.findUnique({
      where: { id: donation.csr_activity_id },
    })

    if (!activity) {
      console.error('❌ [Verify] CSR Activity not found:', donation.csr_activity_id)
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    const transactionRef = donation.transaction_reference

    console.log('🔍 [Verify] Transaction Reference:', transactionRef)

    if (!transactionRef) {
      console.error('❌ [Verify] No transaction reference')
      return NextResponse.json(
        { error: 'Transaction reference not found' },
        { status: 400 }
      )
    }

    // STEP 1: Update status to confirmed FIRST (payment was successful)
    console.log('✅ [Verify] Step 1: Updating donation status to confirmed')

    let updatedDonation = await prisma.csr_activity_participations.update({
      where: { id: participationId },
      data: {
        status: 'confirmed',
        payment_method: 'midtrans',
        updated_at: new Date(),
      },
    })

    console.log('✅ [Verify] Donation status confirmed in DB:', {
      id: updatedDonation.id,
      status: updatedDonation.status,
    })

    // STEP 2: Try to generate and attach certificates (optional, won't block status update)
    console.log('📄 [Verify] Step 2: Generating certificates...')
    try {
      const certificatesDir = path.join(process.cwd(), 'public', 'certificates')
      
      // Create directory if not exists
      if (!fs.existsSync(certificatesDir)) {
        fs.mkdirSync(certificatesDir, { recursive: true })
        console.log('📁 [Verify] Created certificates directory')
      }

      const donationDate = new Date(donation.created_at).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const recipientName = donation.user?.full_name || 'Donor'
      const activityTitle = activity.title || 'Kegiatan CSR'
      const amount = parseFloat(donation.amount?.toString() || '0')

      let thankYouUrl: string | null = null

      // Generate single CSR participation certificate
      try {
        const certBuffer = await generateCSRCertificate({
          recipientName,
          activityTitle,
          activityCategory: activity.category || undefined,
          amount,
          donationDate,
          certificateNumber: `CSR-${participationId.slice(-8).toUpperCase()}`,
        })
        const certFilename = `csr-cert-${participationId}-${Date.now()}.jpg`
        const certPath = path.join(certificatesDir, certFilename)
        fs.writeFileSync(certPath, certBuffer)
        thankYouUrl = `${appBaseUrl}/certificates/${certFilename}`
        console.log('✅ [Verify] CSR certificate generated:', thankYouUrl)
      } catch (e) {
        console.error('❌ [Verify] Failed to generate CSR certificate:', e)
      }

      // Update donation with certificate URL
      if (thankYouUrl) {
        console.log('📝 [Verify] Updating donation with certificate URL...')
        updatedDonation = await prisma.csr_activity_participations.update({
          where: { id: participationId },
          data: {
            thank_you_certificate_url: thankYouUrl,
            updated_at: new Date(),
          },
        })
        console.log('✅ [Verify] Donation updated with certificate:', {
          id: updatedDonation.id,
          thankYouUrl,
        })
      }
    } catch (certError) {
      console.error('⚠️ [Verify] Certificate generation process failed:', certError)
      // BUT status is already confirmed, so continue
    }

    // Get updated donation (with or without certificates)
    const finalDonation = await prisma.csr_activity_participations.findUnique({
      where: { id: participationId },
    })

    // Update activity total_donations_amount
    const updatedActivity = await prisma.csr_activities.update({
      where: { id: activity.id },
      data: {
        total_donations_amount: {
          increment: donation.amount || 0,
        },
      },
    })

    console.log('✅ [Verify] Activity updated:', {
      id: updatedActivity.id,
      newTotal: updatedActivity.total_donations_amount,
    })

    return NextResponse.json({
      success: true,
      status: finalDonation?.status,
      amount: finalDonation?.amount,
      activityId: activity.id,
      certificateUrl: finalDonation?.thank_you_certificate_url,
      message: 'Donation confirmed successfully',
    })
  } catch (error) {
    console.error('❌ [Verify] Error:', {
      participationId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorCode: (error as any)?.code,
    })
    
    if (error instanceof Error && error.message === 'aborted') {
      console.log('ℹ️ [Verify] Request was aborted (likely client disconnected early)')
      // Don't return error response for aborted requests
      return NextResponse.json(
        { error: 'Request aborted' },
        { status: 499 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify donation', 
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}
