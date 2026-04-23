import * as fs from 'fs'
import * as path from 'path'
import prisma from '@/lib/prisma'

type TemplateKey = 'csr' | 'carbon-market'

// Local fallback files shipped with the Next.js app
const LOCAL_FALLBACK: Record<TemplateKey, string> = {
  'csr':           'public/certificates/templates/Template untuk generate.jpeg',
  'carbon-market': 'public/certificates/templates/Template untuk generate - Carbon Market.jpeg',
}

// Short in-memory cache — admin uploads take effect within ~1 minute.
const CACHE_TTL_MS = 60_000
const cache = new Map<string, { buffer: Buffer; at: number }>()

/**
 * Load certificate template (image buffer) for a given tenant & type.
 *
 * Resolution order:
 *   1. Per-tenant template path from `tenant_certificate_templates` (schema v2)
 *      → fetched via Laravel admin storage URL prefix
 *   2. Local fallback JPG bundled with the Next.js app (for first-run / dev)
 */
export async function getCertificateTemplate(
  type: TemplateKey,
  tenantId?: string | null
): Promise<Buffer> {
  const cacheKey = `${tenantId ?? 'default'}:${type}`
  const cached = cache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.buffer
  }

  // 1) Try per-tenant template from DB
  if (tenantId) {
    try {
      const tpl = await prisma.tenant_certificate_templates.findUnique({
        where: { tenant_id: tenantId },
        select: { csr_template_path: true, carbon_template_path: true },
      })

      const relPath = type === 'csr' ? tpl?.csr_template_path : tpl?.carbon_template_path
      if (relPath) {
        const prefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.trim()
        if (prefix) {
          const url = prefix.replace(/\/+$/, '') + '/' + relPath.replace(/^\/+/, '')
          try {
            const res = await fetch(url, { cache: 'no-store' })
            if (res.ok) {
              const ab = await res.arrayBuffer()
              const buffer = Buffer.from(ab)
              cache.set(cacheKey, { buffer, at: now })
              return buffer
            }
          } catch {
            // fall through to local fallback
          }
        }
      }
    } catch (e) {
      console.warn('getCertificateTemplate: DB/fetch failed, using fallback', e)
    }
  }

  // 2) Local fallback
  const localPath = path.join(process.cwd(), LOCAL_FALLBACK[type])
  const buffer = fs.readFileSync(localPath)
  cache.set(cacheKey, { buffer, at: now })
  return buffer
}
