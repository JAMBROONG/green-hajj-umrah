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

    const donations = await prisma.csr_activity_participations.findMany({
      where: { 
        user_id: user.id,
      },
      include: {
        csr_activity: {
          select: { id: true, title: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(
      donations.map((d) => ({
        id: d.id,
        csr_activity_id: d.csr_activity_id,
        type: d.type,
        amount: parseFloat(d.amount?.toString() || '0'),
        status: d.status,
        created_at: d.created_at,
        activity_title: d.csr_activity?.title || 'Unknown Activity',
        certificate_file_url: d.certificate_file_url,
      }))
    )
  } catch (error) {
    console.error('Error fetching CSR donations:', error)
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 })
  }
}
