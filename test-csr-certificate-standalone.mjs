/**
 * Standalone CSR Certificate Generator Test
 * ==========================================
 * Script untuk test generate sertifikat CSR TANPA harus donasi lewat Midtrans.
 * Ambil data dari database, render sertifikat CSR, save ke file.
 *
 * How to run:
 *   node test-csr-certificate-standalone.mjs
 *
 * Optional: kasih participation ID specific:
 *   node test-csr-certificate-standalone.mjs <participation-id>
 *
 * Optional: override avatar URL:
 *   AVATAR_URL=https://i.pravatar.cc/300 node test-csr-certificate-standalone.mjs
 *
 * Output:
 *   ./test-output/csr-certificate-<timestamp>.jpg
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

// ─────────────────────────────────────────────────────────────────────────────
// Setup Prisma with PG adapter
// ─────────────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─────────────────────────────────────────────────────────────────────────────
// Native HTTP GET — bypass undici fetch (flaky di Windows untuk localhost)
// ─────────────────────────────────────────────────────────────────────────────
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
          family: 4,
          timeout: timeoutMs,
          headers: { 'User-Agent': 'csr-cert-test-standalone/1.0', 'Accept': 'image/*' },
        },
        (res) => {
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
// Template loader (local fallback + tenant-specific lookup)
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
          const result = await httpGet(url)
          if (!result.error) return result.buffer
        }
      }
    } catch {
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
    // CASE 1: Local file path
    if (/^([a-zA-Z]:\\|\/)/.test(avatarUrl) && fs.existsSync(avatarUrl)) {
      console.log('🖼️  Loading local avatar file:', avatarUrl)
      const fileBuffer = fs.readFileSync(avatarUrl)
      return await sharp(fileBuffer)
        .resize(targetW, targetH, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 88 })
        .toBuffer()
    }

    // CASE 2: Full URL
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
      `http://localhost:${nextPort}/api/image-proxy/${relPath}`,
      prefix ? `${prefix}/${relPath}` : null,
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
    return null
  } catch (e) {
    console.warn('⚠️  Avatar processing error:', e.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSR Certificate generator (copy of src/lib/csr-certificate-generator.ts)
// ─────────────────────────────────────────────────────────────────────────────
async function generateCSRCertificate(data) {
  const templateBuffer = await getCertificateTemplate('csr', data.tenantId ?? null)
  const template = sharp(templateBuffer)
  const meta = await template.metadata()
  const W = meta.width ?? 1536
  const H = meta.height ?? 1024

  console.log('📐 CSR Template:', W, 'x', H)

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

  // Info box
  const labelY      = Math.round(H * 0.700)
  const valueY      = Math.round(H * 0.750)
  const certNoY     = Math.round(H * 0.792)
  const labelFSize  = Math.round(H * 0.026)
  const valueFSize  = Math.round(H * 0.028)
  const certNoFSize = Math.round(H * 0.022)
  const leftX       = Math.round(W * 0.240)
  const rightX      = Math.round(W * 0.755)

  const name    = escapeXml(data.recipientName)
  const title   = escapeXml(data.activityTitle)
  const donasi  = escapeXml(`Rp ${data.amount.toLocaleString('id-ID')}`)
  const tanggal = escapeXml(data.donationDate)
  const certNo  = data.certificateNumber ? escapeXml(data.certificateNumber) : ''

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

  console.log('\n🎨 CSR Certificate Generator Test (Standalone)')
  console.log('════════════════════════════════════════════════\n')

  // ─── STEP 1: Ambil data participation dari DB ─────────────────────────────
  let donation
  if (arg) {
    console.log('🔍 Looking up participation by ID:', arg)
    donation = await prisma.csr_activity_participations.findUnique({
      where: { id: arg },
      include: { user: true },
    })
    if (!donation) {
      console.error('❌ Participation not found with ID:', arg)
      console.log('\n💡 Tip: run tanpa argumen untuk pakai latest participation:')
      console.log('    node test-csr-certificate-standalone.mjs\n')
      await prisma.$disconnect()
      process.exit(1)
    }
  } else {
    console.log('🔍 Using latest participation from DB (no ID provided)')
    donation = await prisma.csr_activity_participations.findFirst({
      orderBy: { created_at: 'desc' },
      include: { user: true },
    })
    if (!donation) {
      console.log('⚠️  No participation found in DB. Using DUMMY data instead...\n')
      donation = {
        id: 'dummy-' + Date.now(),
        amount: 500000,
        created_at: new Date(),
        csr_activity_id: null,
        user: { full_name: 'Siti Aminah (DUMMY)', tenant_id: null, metadata: {} },
      }
    }
  }

  // ─── STEP 2: Ambil data activity terkait ──────────────────────────────────
  let activity = null
  if (donation.csr_activity_id) {
    activity = await prisma.csr_activities.findUnique({
      where: { id: donation.csr_activity_id },
    })
  }

  if (!activity) {
    activity = {
      title: 'Penanaman Pohon di Yogyakarta (DUMMY)',
      category: 'reforestation',
    }
  }

  console.log('✅ Participation loaded:', {
    id: donation.id,
    recipient: donation.user?.full_name,
    amount: donation.amount?.toString(),
    activity: activity.title,
    category: activity.category,
  })

  // ─── STEP 3: Prepare certificate data ─────────────────────────────────────
  const donationDate = new Date(donation.created_at).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const recipientName = donation.user?.full_name || 'Donor'
  const activityTitle = activity.title || 'Kegiatan CSR'
  const amount        = parseFloat(donation.amount?.toString() || '0')

  // Avatar URL resolution priority:
  //   1. AVATAR_URL env var (bypass untuk testing manual)
  //   2. avatar_url dari DB user metadata
  //   3. null (skip avatar)
  const metadataAvatar = donation.user?.metadata?.avatar_url || null
  const avatarUrl = process.env.AVATAR_URL || metadataAvatar

  if (process.env.AVATAR_URL) {
    console.log('🎯 Using AVATAR_URL override:', process.env.AVATAR_URL)
  } else if (metadataAvatar) {
    console.log('📦 Avatar from DB metadata:', metadataAvatar)
  } else {
    console.log('ℹ️  No avatar in user metadata — will skip avatar rendering')
  }

  const tenantId = donation.user?.tenant_id || null
  if (tenantId) console.log('🏢 Tenant ID:', tenantId)

  console.log('\n📝 CSR Certificate Data:')
  console.log('   Recipient:  ', recipientName)
  console.log('   Activity:   ', activityTitle)
  console.log('   Category:   ', activity.category)
  console.log('   Amount:     ', `Rp ${amount.toLocaleString('id-ID')}`)
  console.log('   Date:       ', donationDate)
  console.log('   Cert No:    ', `CSR-${donation.id.slice(-8).toUpperCase()}`)
  console.log('')

  // ─── STEP 4: Generate certificate ─────────────────────────────────────────
  console.log('🎨 Generating CSR certificate...')
  const startTime = Date.now()

  const pdfBuffer = await generateCSRCertificate({
    recipientName,
    activityTitle,
    activityCategory: activity.category || undefined,
    amount,
    donationDate,
    certificateNumber: `CSR-${donation.id.slice(-8).toUpperCase()}`,
    tenantId,
    avatarUrl,
  })

  const duration = Date.now() - startTime
  console.log(`✅ Certificate generated in ${duration}ms (${(pdfBuffer.length / 1024).toFixed(1)} KB)`)

  // ─── STEP 5: Save to file ─────────────────────────────────────────────────
  const outputDir = path.join(process.cwd(), 'test-output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `csr-certificate-${Date.now()}.jpg`
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
