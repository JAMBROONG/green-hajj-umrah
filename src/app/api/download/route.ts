import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.replace(/\/$/, '').replace('/storage', '') ||
  'http://127.0.0.1:8000'
)

const APP_ORIGIN = (
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')

function isAllowedUrl(url: string): boolean {
  return url.startsWith(BACKEND_ORIGIN) || url.startsWith(APP_ORIGIN)
}

const MIME_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const url = searchParams.get('url')
  const filename = searchParams.get('filename') || 'download'
  const inline = searchParams.get('inline') === '1'

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const disposition = inline
    ? `inline; filename="${encodeURIComponent(filename)}"`
    : `attachment; filename="${encodeURIComponent(filename)}"`

  // For same-origin URLs, read directly from the filesystem (avoids middleware/auth)
  if (url.startsWith(APP_ORIGIN)) {
    try {
      const urlPath = new URL(url).pathname  // e.g. /certificates/xxx.pdf
      const filePath = path.join(process.cwd(), 'public', urlPath)
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      const buffer = fs.readFileSync(filePath)
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const contentType = MIME_MAP[ext] || 'application/octet-stream'
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Content-Length': String(buffer.length),
        },
      })
    } catch {
      return NextResponse.json({ error: 'Download failed' }, { status: 500 })
    }
  }

  // For cross-origin URLs (Laravel backend), fetch via HTTP
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: res.status })
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
