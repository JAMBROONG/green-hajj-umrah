import sharp from 'sharp'
import http from 'node:http'
import https from 'node:https'

/**
 * Native HTTP GET — bypass undici fetch quirks (especially for private IPs on Windows/localhost).
 * Forces IPv4, handles redirects, returns buffer or null.
 */
function httpGetBuffer(url: string, timeoutMs = 8000): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url)
      const isHttps = parsed.protocol === 'https:'
      const lib = isHttps ? https : http

      const req = lib.get(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          family: 4, // force IPv4 (critical for localhost resolution)
          timeout: timeoutMs,
          headers: { 'User-Agent': 'cert-generator/1.0', 'Accept': 'image/*' },
        },
        (res) => {
          if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            const nextUrl = new URL(res.headers.location, url).toString()
            res.destroy()
            return resolve(httpGetBuffer(nextUrl, timeoutMs))
          }
          if (res.statusCode !== 200) {
            console.warn(`⚠️ Avatar HTTP ${res.statusCode} for ${url}`)
            res.destroy()
            return resolve(null)
          }
          const chunks: Buffer[] = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve(Buffer.concat(chunks)))
          res.on('error', () => resolve(null))
        }
      )
      req.on('timeout', () => { req.destroy(); resolve(null) })
      req.on('error', (e) => {
        console.warn(`⚠️ Avatar fetch error [${(e as NodeJS.ErrnoException).code || 'unknown'}] for ${url}:`, e.message)
        resolve(null)
      })
    } catch (e) {
      console.warn('⚠️ Avatar invalid URL:', url, e)
      resolve(null)
    }
  })
}

/**
 * Fetch & resize user avatar from various possible sources.
 *
 * Tries in order:
 *   1. Full https?:// URL as-is
 *   2. (For relative path) Next.js own `/api/image-proxy/` route
 *   3. (For relative path) Direct backend via NEXT_PUBLIC_IMAGE_URL_PREFIX
 *   4. (For relative path) Same as #3 but localhost instead of 127.0.0.1
 *
 * Returns JPEG buffer or null if all candidates fail.
 */
export async function fetchAndResizeAvatar(
  avatarUrl: string,
  targetW: number,
  targetH: number,
): Promise<Buffer | null> {
  try {
    // Data URI — decode base64 langsung, skip network
    const dataUriMatch = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(avatarUrl.trim())
    if (dataUriMatch) {
      console.log('🖼️ Decoding base64 data URI avatar')
      const buf = Buffer.from(dataUriMatch[1], 'base64')
      return await sharp(buf)
        .resize(targetW, targetH, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 88 })
        .toBuffer()
    }

    // Full URL — use as-is
    if (/^https?:\/\//i.test(avatarUrl)) {
      console.log('🖼️ Fetching avatar (direct):', avatarUrl)
      const buf = await httpGetBuffer(avatarUrl)
      if (!buf) return null
      return await sharp(buf)
        .resize(targetW, targetH, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 88 })
        .toBuffer()
    }

    // Relative path — try multiple URL candidates
    const relPath = avatarUrl.replace(/^\/+/, '')
    const prefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.trim().replace(/\/+$/, '')
    const selfBase = (
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`
    ).replace(/\/+$/, '')

    const candidates = [
      `${selfBase}/api/image-proxy/${relPath}`,
      prefix ? `${prefix}/${relPath}` : null,
      prefix ? `${prefix.replace('127.0.0.1', 'localhost')}/${relPath}` : null,
    ].filter((u): u is string => Boolean(u))

    for (const url of candidates) {
      console.log('🖼️ Trying avatar:', url)
      const buf = await httpGetBuffer(url)
      if (buf) {
        return await sharp(buf)
          .resize(targetW, targetH, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 88 })
          .toBuffer()
      }
    }

    console.warn('⚠️ All avatar candidates failed. Skipping avatar.')
    return null
  } catch (e) {
    console.warn('⚠️ Avatar processing error:', e)
    return null
  }
}
