import sharp from 'sharp'
import * as path from 'path'

export interface ThankYouCertData {
  recipientName: string
  activityTitle: string
  amount: number
  donationDate: string
  certificateNumber?: string
}

// Legacy interface kept for backward-compat with old callers
interface CertificateData {
  recipientName: string
  activityTitle: string
  amount: number
  donationDate: string
  certificateType: 'thank-you' | 'participation'
  certificateNumber?: string
}

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'public',
  'certificates',
  'templates',
  'Template untuk generate.jpeg'
)

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c]!))
}

export async function generateThankYouCertificate(data: ThankYouCertData): Promise<Buffer> {
  const template = sharp(TEMPLATE_PATH)
  const meta = await template.metadata()
  const W = meta.width ?? 3508
  const H = meta.height ?? 2480

  const name     = escapeXml(data.recipientName)
  const title    = escapeXml(data.activityTitle)
  const donasi   = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal  = escapeXml(data.donationDate)
  const certNo   = data.certificateNumber ? escapeXml(data.certificateNumber) : ''

  const cx         = W / 2
  const leftColX   = 870
  const rightColX  = W - 870

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <!-- Recipient name (gold, serif italic small-caps) -->
    <text x="${cx}" y="1160"
          text-anchor="middle"
          font-family="'Palatino Linotype','Book Antiqua',Palatino,serif"
          font-size="110" font-weight="bold" font-style="italic"
          font-variant="small-caps" fill="#7B5E1E">${name}</text>

    <!-- Activity title (dark green, bold) -->
    <text x="${cx}" y="1490"
          text-anchor="middle"
          font-family="Arial,Helvetica,sans-serif"
          font-size="78" font-weight="bold" fill="#164C2E">${title}</text>

    <!-- Donasi label (left cell, small) -->
    <text x="${leftColX}" y="1795"
          font-family="Arial,Helvetica,sans-serif"
          font-size="46" fill="#3A3A3A">Donasi</text>

    <!-- Donasi value (left cell, big bold) -->
    <text x="${leftColX}" y="1885"
          font-family="Arial,Helvetica,sans-serif"
          font-size="68" font-weight="bold" fill="#164C2E">${donasi}</text>

    <!-- Tanggal label (right cell, small) -->
    <text x="${rightColX}" y="1795"
          text-anchor="end"
          font-family="Arial,Helvetica,sans-serif"
          font-size="46" fill="#3A3A3A">Tanggal</text>

    <!-- Tanggal value (right cell, big bold) -->
    <text x="${rightColX}" y="1885"
          text-anchor="end"
          font-family="Arial,Helvetica,sans-serif"
          font-size="58" font-weight="bold" fill="#164C2E">${tanggal}</text>

    ${certNo ? `
    <!-- Certificate number (tiny, below left column) -->
    <text x="${leftColX}" y="2030"
          font-family="Arial,Helvetica,sans-serif"
          font-size="34" fill="#555">No. Sertifikat <tspan font-weight="bold" fill="#164C2E">${certNo}</tspan></text>
    ` : ''}
  </svg>`

  return await template
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
}

// ── Legacy wrappers for backward compatibility ───────────────────────────────
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
  data: Omit<CertificateData, 'certificateType'>
): Promise<Buffer> {
  return generateThankYouCertificate(data)
}
