/**
 * Build full image URL from relative path.
 * Relative paths are routed through /api/image-proxy so Next.js Image Optimizer
 * can fetch from any backend (including private IPs like 127.0.0.1) without
 * triggering the SSRF check. The proxy reads NEXT_PUBLIC_IMAGE_URL_PREFIX at
 * runtime, so the backend URL stays fully configurable via env.
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) {
    return '';
  }

  // Already a full URL — return as-is (external CDN, etc.)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Relative path → proxy through Next.js API route (path params, no query string)
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return `/api/image-proxy/${cleanPath}`
}

/**
 * Get placeholder image for when image_url is missing
 */
export function getPlaceholderImage(type: 'csr' | 'carbon'): string {
  if (type === 'csr') {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%" y="50%" font-size="16" text-anchor="middle" dy=".3em" fill="%23999"%3ECSR Activity%3C/text%3E%3C/svg%3E'
  } else {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e8f5e9" width="200" height="200"/%3E%3Ctext x="50%" y="50%" font-size="16" text-anchor="middle" dy=".3em" fill="%23666"%3ECarbon Certificate%3C/text%3E%3C/svg%3E'
  }
}
