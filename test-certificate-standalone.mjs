/**
 * Standalone Certificate Generator Test
 * =====================================
 * Script untuk test generate sertifikat TANPA harus bayar lewat Midtrans.
 * Ambil data dari database, render sertifikat, save ke file.
 *
 * How to run:
 *   node test-certificate-standalone.mjs
 *
 * Optional: kasih purchase ID specific:
 *   node test-certificate-standalone.mjs <purchase-id>
 *
 * Output:
 *   ./test-output/certificate-<timestamp>.jpg
 */

import sharp from 'sharp'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'

dotenv.config()

// Fix Node.js IPv6/IPv4 resolution quirk (Node 20+ default ::1 first)
dns.setDefaultResultOrder('ipv4first')

/**
 * Native HTTP GET — bypass undici fetch (yang flaky di Windows untuk localhost).
 * Return buffer kalau sukses, null kalau error.
 */
function httpGet(url, timeoutMs = 8000) {
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
          family: 4, // force IPv4
          timeout: timeoutMs,
          headers: { 'User-Agent': 'cert-test-standalone/1.0', 'Accept': 'image/*' },
        },
        (res) => {
          // Handle redirect
          if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            const nextUrl = new URL(res.headers.location, url).toString()
            res.destroy()
            return resolve(httpGet(nextUrl, timeoutMs))
          }
          if (res.statusCode !== 200) {
            res.destroy()
            return resolve({ error: `HTTP ${res.statusCode} ${res.statusMessage}` })
          }
          const chunks = []
          res.on('data', c => chunks.push(c))
          res.on('end', () => resolve({ buffer: Buffer.concat(chunks) }))
          res.on('error', e => resolve({ error: e.message }))
        }
      )
      req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout' }) })
      req.on('error', (e) => resolve({ error: `${e.message}${e.code ? ` [${e.code}]` : ''}` }))
    } catch (e) {
      resolve({ error: `Invalid URL: ${e.message}` })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup Prisma with PG adapter (same pattern as seed.ts)
// ─────────────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─────────────────────────────────────────────────────────────────────────────
// Template loader (local fallback only — skip per-tenant DB lookup for simplicity)
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_FALLBACK = {
  'csr':           'public/certificates/templates/Template untuk generate.jpeg',
  'carbon-market': 'public/certificates/templates/Template untuk generate - Carbon Market.jpeg',
}

async function getCertificateTemplate(type, tenantId = null) {
  // Try per-tenant template from DB first
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
          console.log('🌐 Fetching tenant template:', url)
          try {
            const res = await fetch(url, { cache: 'no-store' })
            if (res.ok) {
              const ab = await res.arrayBuffer()
              return Buffer.from(ab)
            }
          } catch {
            // fall through to local fallback
          }
        }
      }
    } catch (e) {
      console.warn('⚠️  Tenant template lookup failed, using local fallback')
    }
  }

  // Local fallback
  const localPath = path.join(process.cwd(), LOCAL_FALLBACK[type])
  console.log('📁 Loading local template:', localPath)
  return fs.readFileSync(localPath)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function escapeXml(s) {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]))
}

async function tryFetch(url, label) {
  console.log(`🖼️  [${label}] Fetching:`, url)
  const result = await httpGet(url)
  if (result.error) {
    console.warn(`   ↳ ❌ ${result.error}`)
    return null
  }
  console.log(`   ↳ ✅ OK (${(result.buffer.length / 1024).toFixed(1)} KB)`)
  return result.buffer
}

async function fetchAndResizeAvatar(avatarUrl, targetW, targetH) {
  try {
    // CASE 1: Local file path (misal C:\... atau /path/to/file)
    if (/^([a-zA-Z]:\\|\/)/.test(avatarUrl) && fs.existsSync(avatarUrl)) {
      console.log('🖼️  Loading local avatar file:', avatarUrl)
      const fileBuffer = fs.readFileSync(avatarUrl)
      return await sharp(fileBuffer)
        .resize(targetW, targetH, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 88 })
        .toBuffer()
    }

    // CASE 2: Full URL (http://... or https://...)
    if (/^https?:\/\//i.test(avatarUrl)) {
      const buf = await tryFetch(avatarUrl, 'DIRECT')
      if (buf) {
        return await sharp(buf)
          .resize(targetW, targetH, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 88 })
          .toBuffer()
      }
      return null
    }

    // CASE 3: Relative path — try multiple URL variants
    const relPath = avatarUrl.replace(/^\/+/, '')
    const prefix = process.env.NEXT_PUBLIC_IMAGE_URL_PREFIX?.trim().replace(/\/+$/, '')
    const nextPort = process.env.NEXT_PORT || '3000'

    const candidates = [
      // 1. Via Next.js image-proxy (same-origin, bypass SSRF) — works if `npm run dev` is up
      `http://localhost:${nextPort}/api/image-proxy/${relPath}`,
      // 2. Direct to Laravel storage via prefix from env
      prefix ? `${prefix}/${relPath}` : null,
      // 3. Swap 127.0.0.1 with localhost (IPv4/IPv6 resolution quirk)
      prefix ? `${prefix.replace('127.0.0.1', 'localhost')}/${relPath}` : null,
    ].filter(Boolean)

    for (const url of candidates) {
      const buf = await tryFetch(url, 'TRY')
      if (buf) {
        return await sharp(buf)
          .resize(targetW, targetH, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 88 })
          .toBuffer()
      }
    }

    console.warn('⚠️  Semua URL candidate gagal. Avatar di-skip.')
    console.warn('    💡 Pastikan salah satu ini jalan:')
    console.warn('       - npm run dev (port 3000) → image-proxy aktif')
    console.warn('       - php artisan serve (port 8000) → Laravel backend')
    console.warn('    💡 Atau test pake URL public: AVATAR_URL=https://i.pravatar.cc/300 node test-certificate-standalone.mjs')
    return null
  } catch (e) {
    console.warn('⚠️  Avatar processing error:', e.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Certificate generator (copy of src/lib/certificate-generator.ts)
// ─────────────────────────────────────────────────────────────────────────────
async function generateThankYouCertificate(data) {
  const templateBuffer = await getCertificateTemplate('carbon-market', data.tenantId ?? null)
  const template = sharp(templateBuffer)
  const meta = await template.metadata()
  const W = meta.width ?? 1536
  const H = meta.height ?? 1024

  console.log('📐 Carbon Template:', W, 'x', H)

  // Foto profil
  const photoLeft   = Math.round(W * 0.076)
  const photoTop    = Math.round(H * 0.338)
  const photoWidth  = Math.round(W * 0.158)
  const photoHeight = Math.round(H * 0.260)

  // Nama user
  const nameCx    = Math.round(W * 0.520)
  const nameY     = Math.round(H * 0.450)
  const nameFSize = Math.round(H * 0.053)

  // Nama program
  const programCx    = Math.round(W * 0.500)
  const programY     = Math.round(H * 0.640)
  const programFSize = Math.round(H * 0.040)

  // Info box
  const labelY      = Math.round(H * 0.700)
  const valueY      = Math.round(H * 0.750)
  const certNoY     = Math.round(H * 0.792)
  const labelFSize  = Math.round(H * 0.026)
  const valueFSize  = Math.round(H * 0.028)
  const certNoFSize = Math.round(H * 0.022)
  const leftX       = Math.round(W * 0.240)
  const rightX      = Math.round(W * 0.755)

  const name       = escapeXml(data.recipientName)
  const program    = escapeXml(
    data.units ? `${data.activityTitle} (${data.units} tCO2e)` : data.activityTitle
  )
  const kontribusi = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal    = escapeXml(data.donationDate)
  const certNo     = data.certificateNumber ? escapeXml(data.certificateNumber) : ''

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

    ${certNo ? `
    <text x="${leftX}" y="${certNoY}"
          font-family="Arial,Helvetica,sans-serif" font-size="${certNoFSize}" fill="#555555">No. Sertifikat: <tspan font-weight="bold" fill="#1A4731">${certNo}</tspan></text>
    ` : ''}
  </svg>`

  const composites = []

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

// ─────────────────────────────────────────────────────────────────────────────
// Main — query DB, generate, save
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2]

  console.log('\n🎨 Certificate Generator Test (Standalone)')
  console.log('═══════════════════════════════════════════\n')

  // ─── STEP 1: Ambil data purchase dari DB ──────────────────────────────────
  let purchase
  if (arg) {
    console.log('🔍 Looking up purchase by ID:', arg)
    purchase = await prisma.carbon_certificate_purchases.findUnique({
      where: { id: arg },
      include: { user: true, standard: true },
    })
    if (!purchase) {
      console.error('❌ Purchase not found with ID:', arg)
      console.log('\n💡 Tip: run tanpa argumen untuk pakai latest purchase:')
      console.log('    node test-certificate-standalone.mjs\n')
      await prisma.$disconnect()
      process.exit(1)
    }
  } else {
    console.log('🔍 Using latest purchase from DB (no ID provided)')
    purchase = await prisma.carbon_certificate_purchases.findFirst({
      orderBy: { created_at: 'desc' },
      include: { user: true, standard: true },
    })
    if (!purchase) {
      console.log('⚠️  No purchase found in DB. Using DUMMY data instead...\n')
      purchase = {
        id: 'dummy-' + Date.now(),
        total_price: 150000,
        units: 1,
        created_at: new Date(),
        user: { full_name: 'Ahmad Fauzi (DUMMY)', metadata: {} },
        standard: { name: 'Standar Nasional - Peatland', series: 'IDNBS' },
      }
    }
  }

  console.log('✅ Purchase loaded:', {
    id: purchase.id,
    recipient: purchase.user?.full_name,
    amount: purchase.total_price?.toString(),
    units: purchase.units,
    standard: purchase.standard?.name || purchase.standard?.series,
  })

  // ─── STEP 2: Prepare certificate data ─────────────────────────────────────
  const purchaseDate = new Date(purchase.created_at).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const recipientName = purchase.user?.full_name || 'Carbon Supporter'
  const productName   = purchase.standard?.name || purchase.standard?.series || 'Carbon Certificate'
  const units         = purchase.units || 0

  // Avatar URL resolution priority:
  //   1. AVATAR_URL env var (bypass untuk testing manual)
  //   2. avatar_url dari DB user metadata
  //   3. null (skip avatar)
  const metadataAvatar = purchase.user?.metadata?.avatar_url || null
  const avatarUrl = process.env.AVATAR_URL || metadataAvatar

  if (process.env.AVATAR_URL) {
    console.log('🎯 Using AVATAR_URL override:', process.env.AVATAR_URL)
  } else if (metadataAvatar) {
    console.log('📦 Avatar from DB metadata:', metadataAvatar)
  } else {
    console.log('ℹ️  No avatar in user metadata — will skip avatar rendering')
  }

  // Tenant ID untuk lookup template per-tenant (kalau ada)
  let tenantId = null
  if (purchase.user?.tenant_id) {
    tenantId = purchase.user.tenant_id
    console.log('🏢 Tenant ID:', tenantId)
  }

  console.log('\n📝 Certificate Data:')
  console.log('   Recipient:  ', recipientName)
  console.log('   Product:    ', productName)
  console.log('   Units:      ', units, 'tCO2e')
  console.log('   Amount:     ', `Rp ${Number(purchase.total_price).toLocaleString('id-ID')}`)
  console.log('   Date:       ', purchaseDate)
  console.log('   Cert No:    ', purchase.id.substring(0, 8).toUpperCase())
  console.log('')

  // ─── STEP 3: Generate certificate ─────────────────────────────────────────
  console.log('🎨 Generating certificate...')
  const startTime = Date.now()

  const pdfBuffer = await generateThankYouCertificate({
    tenantId,
    recipientName,
    activityTitle: productName,
    units,
    amount: parseFloat(purchase.total_price?.toString() || '0'),
    donationDate: purchaseDate,
    certificateNumber: purchase.id.substring(0, 8).toUpperCase(),
    avatarUrl,
  })

  const duration = Date.now() - startTime
  console.log(`✅ Certificate generated in ${duration}ms (${(pdfBuffer.length / 1024).toFixed(1)} KB)`)

  // ─── STEP 4: Save to file ─────────────────────────────────────────────────
  const outputDir = path.join(process.cwd(), 'test-output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `certificate-${Date.now()}.jpg`
  const outputPath = path.join(outputDir, filename)
  fs.writeFileSync(outputPath, pdfBuffer)

  console.log('\n💾 Saved to:', outputPath)
  console.log('\n🎉 Done! Open the file to inspect result.\n')

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('\n❌ Error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
