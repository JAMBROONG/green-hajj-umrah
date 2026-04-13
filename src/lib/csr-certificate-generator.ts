import { jsPDF } from 'jspdf'
import * as fs from 'fs'
import * as path from 'path'
import { APP_NAME_UPPER, APP_TEAM_NAME } from './featureFlags'

export interface CSRCertData {
  recipientName: string
  activityTitle: string
  activityCategory?: string
  amount: number
  donationDate: string
  certificateNumber?: string
}

// ── colour palette ───────────────────────────────────────────────────────────
const DARK_GREEN: [number, number, number] = [8, 50, 26]
const GOLD:       [number, number, number] = [212, 175, 55]
const CREAM:      [number, number, number] = [255, 250, 230]
const LIGHT_TEXT: [number, number, number] = [210, 230, 215]

function readPublicImage(filename: string): string | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', filename))
    const ext = path.extname(filename).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export function generateCSRCertificate(data: CSRCertData): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 297 mm
  const H = doc.internal.pageSize.getHeight()  // 210 mm

  // ── 1. Background: deep-green base ──────────────────────────────────────
  doc.setFillColor(...DARK_GREEN)
  doc.rect(0, 0, W, H, 'F')

  // ── 2. Background photo (bg-home.png) at low opacity via layering ───────
  const bgUrl = readPublicImage('bg-home.png')
  if (bgUrl) {
    try {
      doc.addImage(bgUrl, 'PNG', 0, 0, W, H)
      try {
        doc.saveGraphicsState()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc.setGState((doc as any).GState({ 'fill-opacity': 0.72 }))
        doc.setFillColor(...DARK_GREEN)
        doc.rect(0, 0, W, H, 'F')
        doc.restoreGraphicsState()
      } catch {
        doc.setFillColor(...DARK_GREEN)
        doc.rect(0, 0, W, H, 'F')
        doc.addImage(bgUrl, 'PNG', 0, 0, W, H)
        doc.setFillColor(...DARK_GREEN)
        doc.rect(0, 0, W, 50, 'F')
        doc.rect(0, H - 28, W, 28, 'F')
      }
    } catch {
      // solid green background fallback
    }
  }

  // ── 3. Solid dark header & footer bands ─────────────────────────────────
  doc.setFillColor(...DARK_GREEN)
  doc.rect(0, 0, W, 52, 'F')
  doc.rect(0, H - 28, W, 28, 'F')

  // ── 4. Gold outer + inner border ────────────────────────────────────────
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1.8)
  doc.rect(7, 7, W - 14, H - 14)
  doc.setLineWidth(0.5)
  doc.rect(10, 10, W - 20, H - 20)

  // Corner gold squares
  const cornerOff = 7
  const cornerSize = 4
  for (const [cx, cy] of [
    [cornerOff, cornerOff],
    [W - cornerOff - cornerSize, cornerOff],
    [cornerOff, H - cornerOff - cornerSize],
    [W - cornerOff - cornerSize, H - cornerOff - cornerSize],
  ] as [number, number][]) {
    doc.setFillColor(...GOLD)
    doc.rect(cx, cy, cornerSize, cornerSize, 'F')
  }

  // ── 5. Logo ──────────────────────────────────────────────────────────────
  const logoUrl = readPublicImage('logo.png')
  const logoSize = 26
  const logoX = (W - logoSize) / 2
  const logoY = 13
  if (logoUrl) {
    doc.addImage(logoUrl, 'PNG', logoX, logoY, logoSize, logoSize)
  }

  // ── 6. App name ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  const appNameY = logoUrl ? logoY + logoSize + 4.5 : 26
  const APP_CHAR_SPACE = 2
  const appNameRenderedWidth =
    doc.getTextWidth(APP_NAME_UPPER) + APP_CHAR_SPACE * (APP_NAME_UPPER.length - 1)
  const appNameX = (W - appNameRenderedWidth) / 2
  doc.text(APP_NAME_UPPER, appNameX, appNameY, { align: 'left', charSpace: APP_CHAR_SPACE })

  // ── 7. Gold divider line ─────────────────────────────────────────────────
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.7)
  const divY = appNameY + 4
  doc.line(55, divY, W - 55, divY)

  // ── 8. Certificate title ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...CREAM)
  doc.text('SERTIFIKAT PARTISIPASI', W / 2, divY + 8, { align: 'center' })

  // Thin gold underline for title
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.4)
  const titleUndY = divY + 10
  doc.line(85, titleUndY, W - 85, titleUndY)

  // ── 9. Intro text ────────────────────────────────────────────────────────
  const introY = titleUndY + 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...LIGHT_TEXT)
  doc.text(
    'Dengan bangga kami memberikan penghargaan kepada:',
    W / 2, introY, { align: 'center' }
  )

  // ── 10. Recipient name (hero text) ───────────────────────────────────────
  const nameY = introY + 11
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...GOLD)
  doc.text(data.recipientName, W / 2, nameY, { align: 'center' })

  // Decorative underline beneath name
  const nameWidth = doc.getTextWidth(data.recipientName)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line((W - nameWidth) / 2, nameY + 2, (W + nameWidth) / 2, nameY + 2)

  // ── 11. Participation descriptor ─────────────────────────────────────────
  const ctxY = nameY + 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...LIGHT_TEXT)
  doc.text(
    'atas partisipasi dan kontribusi dalam program CSR lingkungan hidup:',
    W / 2, ctxY, { align: 'center' }
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...CREAM)
  doc.text(data.activityTitle, W / 2, ctxY + 7, { align: 'center', maxWidth: W - 70 })

  if (data.activityCategory) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_TEXT)
    doc.text(data.activityCategory, W / 2, ctxY + 13.5, { align: 'center' })
  }

  // ── 12. Details row ──────────────────────────────────────────────────────
  const detailY = ctxY + (data.activityCategory ? 22 : 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GOLD)

  const amountStr = `Donasi: Rp ${data.amount.toLocaleString('id-ID')}`
  const dateStr   = `Tanggal: ${data.donationDate}`
  doc.text(amountStr, 55, detailY)
  doc.text(dateStr, W - 55, detailY, { align: 'right' })

  if (data.certificateNumber) {
    doc.setFontSize(7.5)
    doc.setTextColor(160, 190, 160)
    doc.text(`No. Sertifikat: ${data.certificateNumber}`, W / 2, detailY + 6, { align: 'center' })
  }

  // ── 13. Signature ────────────────────────────────────────────────────────
  const sigY = H - 20
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(W / 2 - 28, sigY - 6, W / 2 + 28, sigY - 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text(APP_TEAM_NAME, W / 2, sigY - 1, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...LIGHT_TEXT)
  doc.text('Penyelenggara Program CSR Lingkungan', W / 2, sigY + 3.5, { align: 'center' })

  // ── 14. Footer caption ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.setTextColor(130, 170, 140)
  doc.text(
    'Sertifikat ini diterbitkan secara digital sebagai bukti nyata partisipasi dalam program pelestarian lingkungan hidup.',
    W / 2, H - 7, { align: 'center', maxWidth: W - 50 }
  )

  return Buffer.from(doc.output('arraybuffer'))
}
