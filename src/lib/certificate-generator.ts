import sharp from 'sharp'
import { getCertificateTemplate } from './certificate-template-loader'
import { fetchAndResizeAvatar } from './avatar-fetcher'

export interface ThankYouCertData {
  tenantId?: string | null
  recipientName: string
  /** standard.name dari carbon_product_standards */
  activityTitle: string
  /** Jumlah unit (ton CO2e) */
  units?: number
  amount: number
  donationDate: string
  certificateNumber?: string
  /** avatar_url dari profiles.metadata */
  avatarUrl?: string | null
}

interface CertificateData {
  recipientName: string
  activityTitle: string
  amount: number
  donationDate: string
  certificateType: 'thank-you' | 'participation'
  certificateNumber?: string
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]!))
}


export async function generateThankYouCertificate(data: ThankYouCertData): Promise<Buffer> {
  const templateBuffer = await getCertificateTemplate('carbon-market', data.tenantId ?? null)
  const template = sharp(templateBuffer)
  const meta = await template.metadata()
  const W = meta.width ?? 1536
  const H = meta.height ?? 1024

  console.log('📐 Carbon Template:', W, 'x', H)

  // ─── KOORDINAT FINAL — dikalibrasi dari test-certificate.mjs (CSR yang sudah benar) ───
  // Template: 1536 × 1024

  // Foto profil
  const photoLeft   = Math.round(W * 0.2142)
  const photoTop    = Math.round(H * 0.338)
  const photoWidth  = Math.round(W * 0.0912)
  const photoHeight = Math.round(H * 0.190)

  // Nama user — sama dengan CSR yang sudah benar
  const nameCx    = Math.round(W * 0.520)
  const nameY     = Math.round(H * 0.450)
  const nameFSize = Math.round(H * 0.053)

  // Nama program (standard.name + units tCO2e)
  const programCx    = Math.round(W * 0.500)
  const programY     = Math.round(H * 0.640)
  const programFSize = Math.round(H * 0.040)

  // Info box — sama dengan CSR yang sudah benar
  const labelY      = Math.round(H * 0.700)
  const valueY      = Math.round(H * 0.750)
  const certNoY     = Math.round(H * 0.792)
  const labelFSize  = Math.round(H * 0.026)
  const valueFSize  = Math.round(H * 0.028)   // sama dengan CSR
  const certNoFSize = Math.round(H * 0.022)
  const leftX       = Math.round(W * 0.240)   // sama dengan CSR
  const rightX      = Math.round(W * 0.755)   // sama dengan CSR

  // ── Prepare text ──────────────────────────────────────────────────────────
  const name       = escapeXml(data.recipientName)
  const program    = escapeXml(
    data.units ? `${data.activityTitle}` : data.activityTitle
  )
  const kontribusi = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal    = escapeXml(data.donationDate)
  const certNo     = data.certificateNumber ? escapeXml(data.certificateNumber) : ''

  // ── SVG overlay ───────────────────────────────────────────────────────────
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <text x="${nameCx}" y="${nameY}" text-anchor="middle"
          font-family="'Palatino Linotype','Book Antiqua',Georgia,serif"
          font-size="${nameFSize}" font-weight="bold" font-style="italic"
          fill="#1A4731">${name}</text>

    <text x="${programCx}" y="${programY}" text-anchor="middle"
          font-family="Arial,Helvetica,sans-serif"
          font-size="${programFSize}" font-weight="bold"
          fill="#1A4731">${program}</text>

    <text x="${leftX}" y="${labelY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${labelFSize}" fill="#3A3A3A">Kontribusi</text>

    <text x="${leftX}" y="${valueY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${valueFSize}" font-weight="bold" fill="#1A4731">${data.units} tCO2e</text>

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

// Legacy wrappers
export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return generateThankYouCertificate({
    recipientName: data.recipientName,
    activityTitle: data.activityTitle,
    amount: data.amount,
    donationDate: data.donationDate,
    certificateNumber: data.certificateNumber,
  })
}

export async function generateParticipationCertificate(
  data: Omit<CertificateData, 'certificateType'>,
): Promise<Buffer> {
  return generateThankYouCertificate(data)
}
