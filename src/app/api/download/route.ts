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

// Self-origin di-detect runtime via request.nextUrl.origin di handler — bukan
// dari env. Lebih robust: same-origin URL pasti match request, terlepas dari
// localhost vs 127.0.0.1 vs domain prod.

const ALLOW_PRIVATE_IPS = process.env.NODE_ENV !== 'production'

/**
 * Parse URL & match origin secara strict.
 * Return: { kind, parsed } atau null kalau URL invalid/rejected.
 *
 * Relative URL (mis. `/api/image-proxy/...`) di-resolve terhadap origin
 * request saat ini — itu pattern yang dipakai getImageUrl() di sisi client
 * untuk menjembatani path Laravel storage lewat Next.js.
 */
function classifyUrl(url: string, requestOrigin: string): { kind: 'self' | 'backend'; parsed: URL } | null {
  let parsed: URL
  try {
    // Allow relative URL — resolve terhadap requestOrigin saat ini.
    parsed = new URL(url, requestOrigin)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  // Compare via URL.origin (scheme + host + port) — bukan startsWith() yg rentan
  // prefix match attack (mis. `http://127.0.0.1:8000.evil.com`).
  let backendOrigin: string
  try {
    backendOrigin = new URL(BACKEND_ORIGIN).origin
  } catch {
    return null
  }

  // Self-origin: pakai requestOrigin saat ini (lebih robust dari env APP_ORIGIN
  // yang bisa mismatch saat user akses via 127.0.0.1 vs localhost).
  if (parsed.origin === requestOrigin) return { kind: 'self', parsed }
  if (parsed.origin === backendOrigin) return { kind: 'backend', parsed }
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

  const classification = classifyUrl(url, request.nextUrl.origin)
  if (!classification) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { kind, parsed } = classification

  // Sanitize filename untuk Content-Disposition — hapus karakter yg bisa break
  // header ATAU jadi vector phishing (CRLF, quote). Cap length 200 char.
  const safeFilename = filename
    .replace(/[\r\n"\\]/g, '')
    .slice(0, 200) || 'download'
  const disposition = inline
    ? `inline; filename="${encodeURIComponent(safeFilename)}"`
    : `attachment; filename="${encodeURIComponent(safeFilename)}"`

  // ── Self-origin handler ─────────────────────────────────────────────
  // Dua sub-case:
  //   a. /api/* → dynamic Next.js route (mis. /api/image-proxy/...,
  //      /api/certificate-file/...) yang tidak ada di filesystem. Fetch
  //      via HTTP biar Next.js handle routing-nya. PENTING: forward cookies
  //      dari incoming request supaya target route punya konteks session
  //      user yang sama (mis. /api/certificate-file butuh auth + ownership
  //      check). Tanpa forwarding ini, server fetch jadi anonim → 401.
  //   b. /static-path → file fisik di public/ dir. Read langsung dari fs
  //      (lebih cepat, no extra HTTP hop, no SSRF risk).
  if (kind === 'self') {
    if (parsed.pathname.startsWith('/api/')) {
      try {
        const cookieHeader = request.headers.get('cookie')
        const res = await fetch(parsed.toString(), {
          headers: cookieHeader ? { cookie: cookieHeader } : {},
        })
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

    // Static file — read from filesystem (public/ dir)
    try {
      const urlPath = parsed.pathname  // e.g. /certificates/xxx.pdf

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
    const safe = await isHostnameSafeForFetch(parsed.hostname)
    if (!safe) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const res = await fetch(parsed.toString())
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
