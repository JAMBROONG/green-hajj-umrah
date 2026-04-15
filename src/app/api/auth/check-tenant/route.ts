import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  try {
    // IP-based rate limit: 20 login page submissions per IP per 15 minutes
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const ipCheck = rateLimiter.check(`login:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipCheck.allowed) {
      const retryMin = Math.ceil((ipCheck.retryAfterMs ?? 900_000) / 60_000);
      return NextResponse.json(
        { status: 'rate_limited', message: `Terlalu banyak percobaan. Coba lagi dalam ${retryMin} menit.` },
        { status: 429 },
      );
    }

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
