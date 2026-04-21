import * as fs from 'fs'
import * as path from 'path'

type TemplateKey = 'csr' | 'carbon-market'

// Remote filenames under {NEXT_PUBLIC_IMAGE_URL_PREFIX}/certificate-templates/
const REMOTE_PATH: Record<TemplateKey, string> = {
  'csr':           'certificate-templates/csr.jpg',
  'carbon-market': 'certificate-templates/carbon-market.jpg',
}

// Local fallback files shipped with the Next.js app
const LOCAL_FALLBACK: Record<TemplateKey, string> = {
  'csr':           'public/certificates/templates/Template untuk generate.jpeg',
  'carbon-market': 'public/certificates/templates/Template untuk generate - Carbon Market.jpeg',
}

// Short in-memory cache — admin uploads take effect within ~1 minute.
const CACHE_TTL_MS = 60_000
const cache = new Map<TemplateKey, { buffer: Buffer; at: number }>()

export async function getCertificateTemplate(type: TemplateKey): Promise<Buffer> {
  const cached = cache.get(type)
  const now = Date.now()
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.buffer
  }

  const prefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.trim()
  if (prefix) {
    const url = prefix.replace(/\/+$/, '') + '/' + REMOTE_PATH[type]
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const ab = await res.arrayBuffer()
        const buffer = Buffer.from(ab)
        cache.set(type, { buffer, at: now })
        return buffer
      }
    } catch {
      // Network/DNS error — fall back to local file below.
    }
  }

  // Fallback: local file shipped with the Next.js app
  const localPath = path.join(process.cwd(), LOCAL_FALLBACK[type])
  const buffer = fs.readFileSync(localPath)
  cache.set(type, { buffer, at: now })
  return buffer
}
