import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Serve certificate files from public/certificates/ reliably.
 * Works bypassing any reverse-proxy (nginx/PM2) static file quirks.
 *
 * URL: /api/certificate-file/<filename>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // Prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  // Only allow whitelisted extensions
  if (!/\.(jpe?g|png|pdf|webp)$/i.test(filename)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
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
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
