import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

/**
 * GET /api/cert-files/[filename]
 *
 * Serves generated certificate images from disk. Needed because the static
 * path `/certificates/*` collides with the dynamic page route
 * `/certificates/[id]/page.tsx` — in Next.js, page routes win over static
 * files, so requests for `/certificates/xxx.jpg` get routed to the page
 * handler and return HTML instead of the image.
 *
 * This route bypasses that collision by using `/api/cert-files/` which has
 * no route conflict.
 *
 * Accepts lookups in two locations (first match wins):
 *   1. {cwd}/storage/certificates/{filename}  — preferred, writable dir
 *      that survives standalone/Docker builds
 *   2. {cwd}/public/certificates/{filename}    — legacy location for
 *      records written before this route existed
 */

const SEARCH_DIRS = [
  path.join(process.cwd(), 'storage', 'certificates'),
  path.join(process.cwd(), 'public', 'certificates'),
]

const MIME: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.pdf':  'application/pdf',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // Guard against path traversal — strip any slashes / backslashes / ..
  const safe = path.basename(filename)
  if (!safe || safe !== filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  for (const dir of SEARCH_DIRS) {
    const full = path.join(dir, safe)
    try {
      if (fs.existsSync(full)) {
        const buf = fs.readFileSync(full)
        const ext = path.extname(safe).toLowerCase()
        return new NextResponse(new Uint8Array(buf), {
          status: 200,
          headers: {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            // Immutable — filenames include a timestamp, so the same filename
            // always returns the same bytes. Let browsers cache aggressively.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }
    } catch {
      /* try next dir */
    }
  }

  return NextResponse.json({ error: 'File not found', filename: safe }, { status: 404 })
}
