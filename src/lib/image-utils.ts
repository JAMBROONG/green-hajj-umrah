/**
 * Build full image URL from relative path
 * Combines IMAGE_URL_PREFIX from env with the image path
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) {
    return '';
  }

  // If already full URL (starts with http/https), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Get prefix from env or fallback to localhost
  const rawPrefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX || 'http://localhost:3000'
  // Normalise: strip trailing slash from prefix, strip leading slash from path
  const prefix = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix
  const path = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath

  return `${prefix}/${path}`
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
