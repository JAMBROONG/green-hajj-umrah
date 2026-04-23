import sharp from 'sharp'
import { getCertificateTemplate } from './certificate-template-loader'

export interface CSRCertData {
  recipientName: string
  activityTitle: string
  activityCategory?: string
  amount: number
  donationDate: string
  certificateNumber?: string
  tenantId?: string | null
  avatarUrl?: string | null
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]!))
}

async function fetchAndResizeAvatar(
  avatarUrl: string,
  targetW: number,
  targetH: number,
): Promise<Buffer | null> {
  try {
    const prefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.trim().replace(/\/+$/, '')
    const url = /^https?:\/\//i.test(avatarUrl)
      ? avatarUrl
      : `${prefix}/${avatarUrl.replace(/^\/+/, '')}`
    console.log('🖼️ CSR: Fetching avatar:', url)
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (!res.ok) { console.warn('⚠️ CSR Avatar fetch failed:', res.status); return null }
    const ab = await res.arrayBuffer()
    return await sharp(Buffer.from(ab))
      .resize(targetW, targetH, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 88 })
      .toBuffer()
  } catch (e) {
    console.warn('⚠️ CSR Avatar fetch error:', e)
    return null
  }
}

export async function generateCSRCertificate(data: CSRCertData): Promise<Buffer> {
  const templateBuffer = await getCertificateTemplate('csr', data.tenantId ?? null)
  const template = sharp(templateBuffer)
  const meta = await template.metadata()
  const W = meta.width ?? 1536
  const H = meta.height ?? 1024

  console.log('📐 CSR Template:', W, 'x', H)

  // ─── KOORDINAT FINAL — dikalibrasi dan diverifikasi manual via test-certificate.mjs ───
  // Template: 1536 × 1024

  // Foto profil
  const photoLeft   = Math.round(W * 0.076)
  const photoTop    = Math.round(H * 0.338)
  const photoWidth  = Math.round(W * 0.158)
  const photoHeight = Math.round(H * 0.260)

  // Nama user
  const nameCx    = Math.round(W * 0.520)
  const nameY     = Math.round(H * 0.450)
  const nameFSize = Math.round(H * 0.053)

  // Judul kegiatan CSR
  const titleCx    = Math.round(W * 0.500)
  const titleY     = Math.round(H * 0.620)
  const titleFSize = Math.round(H * 0.040)

  // CATATAN: Kategori (reforestation, dll) SUDAH ADA di template CSR — tidak perlu overlay

  // Info box
  const labelY      = Math.round(H * 0.700)
  const valueY      = Math.round(H * 0.750)
  const certNoY     = Math.round(H * 0.792)
  const labelFSize  = Math.round(H * 0.026)
  const valueFSize  = Math.round(H * 0.028)
  const certNoFSize = Math.round(H * 0.022)
  const leftX       = Math.round(W * 0.240)
  const rightX      = Math.round(W * 0.755)

  // ── Prepare text ──────────────────────────────────────────────────────────
  const name    = escapeXml(data.recipientName)
  const title   = escapeXml(data.activityTitle)
  const donasi  = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal = escapeXml(data.donationDate)
  const certNo  = data.certificateNumber ? escapeXml(data.certificateNumber) : ''

  // ── SVG overlay ───────────────────────────────────────────────────────────
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <text x="${nameCx}" y="${nameY}" text-anchor="middle"
          font-family="'Palatino Linotype','Book Antiqua',Georgia,serif"
          font-size="${nameFSize}" font-weight="bold" font-style="italic"
          fill="#1A4731">${name}</text>

    <text x="${titleCx}" y="${titleY}" text-anchor="middle"
          font-family="Arial,Helvetica,sans-serif"
          font-size="${titleFSize}" font-weight="bold"
          fill="#1A4731">${title}</text>

    <text x="${leftX}" y="${labelY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${labelFSize}" fill="#3A3A3A">Donasi</text>

    <text x="${leftX}" y="${valueY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${valueFSize}" font-weight="bold" fill="#1A4731">${donasi}</text>

    <text x="${rightX}" y="${labelY}" text-anchor="end"
          font-family="Arial,Helvetica,sans-serif" font-size="${labelFSize}" fill="#3A3A3A">Tanggal:</text>

    <text x="${rightX}" y="${valueY}" text-anchor="end"
          font-family="Arial,Helvetica,sans-serif" font-size="${valueFSize}" font-weight="bold" fill="#1A4731">${tanggal}</text>

    ${certNo ? `
    <text x="${leftX}" y="${certNoY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${certNoFSize}" fill="#555555">No. Sertifikat: <tspan font-weight="bold" fill="#1A4731">${certNo}</tspan></text>
    ` : ''}
  </svg>`

  // ── Composite ─────────────────────────────────────────────────────────────
  const composites: sharp.OverlayOptions[] = []

  if (data.avatarUrl) {
    const avatarBuf = await fetchAndResizeAvatar(data.avatarUrl, photoWidth, photoHeight)
    if (avatarBuf) composites.push({ input: avatarBuf, left: photoLeft, top: photoTop })
  }
  composites.push({ input: Buffer.from(svg), top: 0, left: 0 })

  return await template
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
}
