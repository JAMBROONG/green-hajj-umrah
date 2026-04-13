import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ status: 'ok' })
    }

    const user = await prisma.profiles.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        role: true,
        tenant: { select: { is_active: true } },
      },
    })

    if (!user || user.role !== 'jemaah') {
      return NextResponse.json({ status: 'ok' })
    }

    if (!user.tenant || !user.tenant.is_active) {
      return NextResponse.json({ status: 'frozen' })
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'ok' })
  }
}
