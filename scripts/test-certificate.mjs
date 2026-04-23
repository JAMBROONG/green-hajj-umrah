/**
 * Test script: generate sertifikat carbon-market dan CSR
 * Jalankan: node scripts/test-certificate.mjs
 */
import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// ─── helper ──────────────────────────────────────────────────────────────────
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]))
}

// ─── Generate Carbon Market Certificate ──────────────────────────────────────
async function generateCarbonCert(templatePath, outputPath, data) {
  const templateBuf = fs.readFileSync(templatePath)
  const template = sharp(templateBuf)
  const { width: W, height: H } = await template.metadata()
  console.log(`📐 Template: ${W} × ${H}`)

  // ── Koordinat (persentase × dimensi) ──
  const photoLeft = Math.round(W * 0.076)
  const photoTop = Math.round(H * 0.338)
  const photoWidth = Math.round(W * 0.158)
  const photoHeight = Math.round(H * 0.260)

  const nameCx = Math.round(W * 0.520)
  const nameY = Math.round(H * 0.450)
  const nameFSize = Math.round(H * 0.053)



  const programCx = Math.round(W * 0.500)
  const programY = Math.round(H * 0.640)  // fixed: below template text
  const programFSize = Math.round(H * 0.040)

  const labelY = Math.round(H * 0.700)
  const valueY = Math.round(H * 0.752)
  const certNoY = Math.round(H * 0.810)
  const labelFSize = Math.round(H * 0.026)
  const valueFSize = Math.round(H * 0.028)
  const certNoFSize = Math.round(H * 0.022)
  const leftX = Math.round(W * 0.240)
  const rightX = Math.round(W * 0.850)

  console.log(`📍 Key coords: nameCx=${nameCx} nameY=${nameY} programY=${programY}`)
  console.log(`📍 Box: leftX=${leftX} rightX=${rightX} labelY=${labelY} valueY=${valueY}`)

  const name = escapeXml(data.name)
  const program = escapeXml(data.units ? `${data.title} (${data.units} tCO2e)` : data.title)
  const kontribusi = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal = escapeXml(data.date)
  const certNo = escapeXml(data.certNo)

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
          font-family="Arial,Helvetica,sans-serif" font-size="${valueFSize}" font-weight="bold" fill="#1A4731">${kontribusi}</text>

    <text x="${rightX}" y="${labelY}" text-anchor="end"
          font-family="Arial,Helvetica,sans-serif" font-size="${labelFSize}" fill="#3A3A3A">Tanggal:</text>

    <text x="${rightX}" y="${valueY}" text-anchor="end"
          font-family="Arial,Helvetica,sans-serif" font-size="${valueFSize}" font-weight="bold" fill="#1A4731">${tanggal}</text>

    <text x="${leftX}" y="${certNoY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${certNoFSize}" fill="#555555">No. Sertifikat: <tspan font-weight="bold" fill="#1A4731">${certNo}</tspan></text>
  </svg>`

  const composites = [{ input: Buffer.from(svg), top: 0, left: 0 }]

  // Avatar test (pakai foto lokal jika ada)
  if (data.avatarPath && fs.existsSync(data.avatarPath)) {
    const avatarBuf = await sharp(fs.readFileSync(data.avatarPath))
      .resize(photoWidth, photoHeight, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 88 })
      .toBuffer()
    composites.unshift({ input: avatarBuf, left: photoLeft, top: photoTop })
    console.log(`🖼️ Avatar composited at left=${photoLeft} top=${photoTop} ${photoWidth}×${photoHeight}`)
  }

  await template.composite(composites).jpeg({ quality: 92 }).toFile(outputPath)
  console.log(`✅ Carbon cert saved: ${outputPath}`)
}

// ─── Generate CSR Certificate ─────────────────────────────────────────────────
async function generateCSRCert(templatePath, outputPath, data) {
  const templateBuf = fs.readFileSync(templatePath)
  const template = sharp(templateBuf)
  const { width: W, height: H } = await template.metadata()
  console.log(`📐 CSR Template: ${W} × ${H}`)

  const photoLeft = Math.round(W * 0.076)
  const photoTop = Math.round(H * 0.338)
  const photoWidth = Math.round(W * 0.158)
  const photoHeight = Math.round(H * 0.260)

  const nameCx = Math.round(W * 0.520)
  const nameY = Math.round(H * 0.450)
  const nameFSize = Math.round(H * 0.053)

  const titleCx = Math.round(W * 0.500)
  const titleY = Math.round(H * 0.620)  // fixed: below 'atas partisipasi...' text
  const titleFSize = Math.round(H * 0.040)

  // NOTE: category line is already IN the CSR template image — no need to overlay

  const labelY = Math.round(H * 0.718)
  const valueY = Math.round(H * 0.770)
  const certNoY = Math.round(H * 0.824)
  const labelFSize = Math.round(H * 0.026)
  const valueFSize = Math.round(H * 0.028)
  const certNoFSize = Math.round(H * 0.022)
  const leftX = Math.round(W * 0.240)
  const rightX = Math.round(W * 0.755)  // fixed: avoid badge

  const name = escapeXml(data.name)
  const title = escapeXml(data.title)
  const cat = escapeXml(data.category || '')
  const donasi = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal = escapeXml(data.date)
  const certNo = escapeXml(data.certNo)

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

    <text x="${leftX}" y="${certNoY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${certNoFSize}" fill="#555555">No. Sertifikat: <tspan font-weight="bold" fill="#1A4731">${certNo}</tspan></text>
  </svg>`

  const composites = [{ input: Buffer.from(svg), top: 0, left: 0 }]

  if (data.avatarPath && fs.existsSync(data.avatarPath)) {
    const avatarBuf = await sharp(fs.readFileSync(data.avatarPath))
      .resize(photoWidth, photoHeight, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 88 })
      .toBuffer()
    composites.unshift({ input: avatarBuf, left: photoLeft, top: photoTop })
  }

  await template.composite(composites).jpeg({ quality: 92 }).toFile(outputPath)
  console.log(`✅ CSR cert saved: ${outputPath}`)
}

// ─── Run ──────────────────────────────────────────────────────────────────────
const TENANT_ID = 'a23605d5-228c-4726-af52-8490e8d6fb6b'
const TEMPLATE_BASE = path.join(
  ROOT, '..', 'green-hajj-umrah-admin', 'storage', 'app', 'public', 'certificate-templates'
)

const carbonTpl = path.join(TEMPLATE_BASE, TENANT_ID, 'carbon-market.jpg')
const csrTpl = path.join(TEMPLATE_BASE, TENANT_ID, 'csr.jpg')

const outDir = path.join(ROOT, 'public', 'certificates')
fs.mkdirSync(outDir, { recursive: true })

await generateCarbonCert(
  carbonTpl,
  path.join(outDir, 'test-carbon.jpg'),
  {
    name: 'Siti Aminah',
    title: 'Kredit Karbon Geotermal Lahendong',
    units: 1,
    amount: 150000,
    date: 'Senin, 20 April 2026',
    certNo: 'E812C4E2',
    avatarPath: null, // isi path foto jika mau test avatar
  }
)

await generateCSRCert(
  csrTpl,
  path.join(outDir, 'test-csr.jpg'),
  {
    name: 'Siti Aminah',
    title: 'Penanaman Pohon di Yogyakarta',
    category: 'reforestation',
    amount: 50000,
    date: 'Senin, 20 April 2026',
    certNo: 'CSR-6AB3BD71',
    avatarPath: null,
  }
)

console.log('\n🎉 Done! Buka di browser:')
console.log('  http://localhost:3000/certificates/test-carbon.jpg')
console.log('  http://localhost:3000/certificates/test-csr.jpg')
