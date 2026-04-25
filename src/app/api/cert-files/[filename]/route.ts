import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/cert-files/[filename]
 *
 * Serves generated certificate images from disk.
 *
 * SECURITY:
 *   - Wajib login (auth()). Tanpa login, return 401.
 *   - Kepemilikan filename di-verify ke DB: filename harus muncul di salah
 *     satu kolom *_certificate_url milik user yang sedang login (carbon
 *     purchase ATAU CSR participation). Tanpa check ini, siapapun yang
 *     mengetahui filename (mis. via leak, brute-force, atau tab share)
 *     bisa download sertifikat user lain — bocor PII.
 *   - Path traversal tetap di-guard via path.basename + strict equality.
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

/**
 * Cek apakah filename ini memang sertifikat milik user yang sedang login.
 *
 * Match strategy: cari record di carbon_certificate_purchases atau
 * csr_activity_participations yang URL-nya berakhir dengan filename ini
 * AND user_id == userId. Pakai `endsWith` karena URL tersimpan sebagai
 * absolute URL (mis. https://app.com/api/cert-files/foo.jpg).
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
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { filename } = await params

  // Guard against path traversal — strip any slashes / backslashes / ..
  const safe = path.basename(filename)
  if (!safe || safe !== filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  // Ownership check: filename harus tercatat sebagai sertifikat user ini.
  const owns = await userOwnsCertFile(session.user.id, safe)
  if (!owns) {
    // Return 404 (bukan 403) supaya tidak leak existence file orang lain.
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
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
            // Cache-Control private supaya CDN/proxy publik tidak cache file
            // bersama. Filename sudah include timestamp, jadi browser sendiri
            // tetap boleh cache lama.
            'Cache-Control': 'private, max-age=31536000, immutable',
          },
        })
      }
    } catch {
      /* try next dir */
    }
  }

  return NextResponse.json({ error: 'File not found' }, { status: 404 })
}
