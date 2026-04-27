import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { isHostnameSafeForFetch } from '@/lib/url-safety'

/**
 * GET /api/download?url=...
 *
 * Proxy download utility — diizinkan hanya untuk:
 *   1. Origin self (App's own /public/certificates/* yang di-serve via filesystem)
 *   2. Origin backend Laravel (untuk file yg di-host di sana)
 *
 * SECURITY (VAFinal-001 fix):
 *   - DULU pakai `url.startsWith(BACKEND_ORIGIN)` — bisa di-bypass dengan
 *     hostname trick `http://127.0.0.1:8000.evil.com` karena prefix match
 *     tanpa boundary character.
 *   - Sekarang pakai strict origin compare via `URL.origin`. Comparison
 *     mencakup scheme + host + port secara eksak.
 *   - Plus DNS-resolved private IP guard di production (defense-in-depth
 *     terhadap DNS rebinding & legacy data).
 */

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.replace(/\/$/, '').replace('/storage', '') ||
  'http://127.0.0.1:8000'
)

const APP_ORIGIN = (
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')

const ALLOW_PRIVATE_IPS = process.env.NODE_ENV !== 'production'

/**
 * Parse URL & match origin secara strict.
 * Return classification: 'self' | 'backend' | null (rejected).
 */
function classifyUrl(url: string): 'self' | 'backend' | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  // Compare via URL.origin (scheme + host + port) — bukan startsWith() yg rentan
  // prefix match attack (mis. `http://127.0.0.1:8000.evil.com`).
  let appOrigin: string
  let backendOrigin: string
  try {
    appOrigin     = new URL(APP_ORIGIN).origin
    backendOrigin = new URL(BACKEND_ORIGIN).origin
  } catch {
    return null
  }

  if (parsed.origin === appOrigin)     return 'self'
  if (parsed.origin === backendOrigin) return 'backend'
  return null
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

  const classification = classifyUrl(url)
  if (!classification) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Sanitize filename untuk Content-Disposition — hapus karakter yg bisa break
  // header ATAU jadi vector phishing (CRLF, quote). Cap length 200 char.
  const safeFilename = filename
    .replace(/[\r\n"\\]/g, '')
    .slice(0, 200) || 'download'
  const disposition = inline
    ? `inline; filename="${encodeURIComponent(safeFilename)}"`
    : `attachment; filename="${encodeURIComponent(safeFilename)}"`

  // ── Self-origin: read directly from filesystem ───────────────────────
  if (classification === 'self') {
    try {
      const urlPath = new URL(url).pathname  // e.g. /certificates/xxx.pdf

      // Resolve absolute path lalu pastikan tetap di dalam public/ dir.
      // Defense-in-depth — URL constructor sebenarnya sudah normalize `..`
      // jadi pathname tidak akan bocor keluar root. Tapi tetap re-validate.
      const publicDir = path.resolve(process.cwd(), 'public')
      const filePath  = path.resolve(publicDir, '.' + urlPath)
      if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

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

  // ── Backend-origin: fetch via HTTP, with private-IP guard di production ─
  if (!ALLOW_PRIVATE_IPS) {
    try {
      const hostname = new URL(url).hostname
      const safe = await isHostnameSafeForFetch(hostname)
      if (!safe) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

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
