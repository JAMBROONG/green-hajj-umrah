import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/image-proxy/[...path]
 *
 * Forwards image requests ke backend Laravel admin (NEXT_PUBLIC_IMAGE_URL_PREFIX).
 *
 * SECURITY:
 *   - Setiap segmen path divalidasi: hanya boleh karakter aman (alphanum, -, _, .),
 *     menolak '..', '/', '\', dan percent-encoded traversal (%2e%2e, %2f, ...).
 *   - URL final di-resolve dan dipastikan tetap berada di bawah base prefix
 *     (mencegah hostname-injection mis. <prefix>/@evil.com/x.jpg).
 *   - Hanya content-type yang diawali "image/" yang dikembalikan — block HTML/JS
 *     supaya proxy tidak bisa dipakai sebagai open-relay XSS.
 *   - Hanya ekstensi gambar umum yang diizinkan.
 */

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'])
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  if (!Array.isArray(path) || path.length === 0 || path.length > 8) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
  }

  for (const seg of path) {
    if (typeof seg !== 'string' || !seg || seg.length > 128) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
    }
    if (seg === '.' || seg === '..' || !SEGMENT_RE.test(seg)) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
    }
    if (/%2e|%2f|%5c/i.test(seg)) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
    }
  }

  const lastSeg = path[path.length - 1]
  const ext = lastSeg.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Invalid image extension' }, { status: 400 })
  }

  const imagePath = path.join('/')

  const prefix = (process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX || 'http://localhost:3000').replace(/\/$/, '')

  let prefixUrl: URL
  let resolvedUrl: URL
  try {
    prefixUrl   = new URL(prefix)
    resolvedUrl = new URL(`${prefix}/${imagePath}`)
  } catch {
    return NextResponse.json({ error: 'Invalid proxy configuration' }, { status: 500 })
  }

  // Defense-in-depth: pastikan host tidak berubah setelah resolve (mencegah
  // injection via path yang mengandung "@" atau "//" walaupun sudah di-block).
  if (resolvedUrl.host !== prefixUrl.host || resolvedUrl.protocol !== prefixUrl.protocol) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
  }

  try {
    const upstream = await fetch(resolvedUrl.toString(), {
      next: { revalidate: 86400 },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    if (!/^image\//i.test(contentType)) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 })
    }

    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
