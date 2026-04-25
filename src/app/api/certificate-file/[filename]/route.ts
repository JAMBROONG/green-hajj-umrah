import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * Serve certificate files from public/certificates/ reliably.
 * Works bypassing any reverse-proxy (nginx/PM2) static file quirks.
 *
 * URL: /api/certificate-file/<filename>
 *
 * SECURITY (sama dengan /api/cert-files): wajib login dan filename harus
 * tercatat sebagai sertifikat milik user di DB. Mencegah download silang.
 */
async function userOwnsCertFile(userId: string, filename: string): Promise<boolean> {
  const suffix = `/${filename}`
  const [carbon, csr] = await Promise.all([
    prisma.carbon_certificate_purchases.count({
      where: {
        user_id: userId,
        OR: [
          { thank_you_certificate_url: { endsWith: suffix } },
          { emission_reduction_certificate_url: { endsWith: suffix } },
        ],
      },
    }),
    prisma.csr_activity_participations.count({
      where: {
        user_id: userId,
        OR: [
          { thank_you_certificate_url: { endsWith: suffix } },
          { participation_certificate_url: { endsWith: suffix } },
        ],
      },
    }),
  ])
  return carbon > 0 || csr > 0
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { filename } = await params

  // Prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  // Only allow whitelisted extensions
  if (!/\.(jpe?g|png|pdf|webp)$/i.test(filename)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  // Ownership check
  const owns = await userOwnsCertFile(session.user.id, filename)
  if (!owns) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'public', 'certificates', filename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)

  const ext = path.extname(filename).toLowerCase()
  const contentType =
    ext === '.pdf'  ? 'application/pdf' :
    ext === '.png'  ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
                      'image/jpeg'

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
