import prisma from '@/lib/prisma'

type TemplateKey = 'csr' | 'carbon-market'

// Short in-memory cache — admin uploads take effect within ~1 minute.
const CACHE_TTL_MS = 60_000
const cache = new Map<string, { buffer: Buffer; at: number }>()

/**
 * Load certificate template (image buffer) for a given tenant & type.
 *
 * Source: per-tenant template path from `tenant_certificate_templates` (schema v2),
 * fetched via Laravel admin storage URL prefix (env: NEXT_PUBLIC_IMAGE_URL_PREFIX).
 *
 * Fail loudly: caller harus handle error. Sebelumnya ada local-disk fallback,
 * tapi file fallback tidak di-ship di repo — silent ENOENT lebih membingungkan
 * daripada error eksplisit ini.
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

  if (!tenantId) {
    throw new Error(
      `Certificate template '${type}': tenantId required (no template configured for this request)`
    )
  }

  const tpl = await prisma.tenant_certificate_templates.findUnique({
    where: { tenant_id: tenantId },
    select: { csr_template_path: true, carbon_template_path: true },
  })

  const relPath = type === 'csr' ? tpl?.csr_template_path : tpl?.carbon_template_path
  if (!relPath) {
    throw new Error(
      `Certificate template '${type}' belum dikonfigurasi untuk tenant ${tenantId}. ` +
      `Admin perlu upload template lewat halaman tenant.`
    )
  }

  const prefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.trim()
  if (!prefix) {
    throw new Error(
      `Cannot fetch certificate template: NEXT_PUBLIC_IMAGE_URL_PREFIX not set in environment`
    )
  }

  const url = prefix.replace(/\/+$/, '') + '/' + relPath.replace(/^\/+/, '')
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(
      `Certificate template fetch failed (${res.status}) for tenant ${tenantId}, type=${type}`
    )
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  cache.set(cacheKey, { buffer, at: now })
  return buffer
}
