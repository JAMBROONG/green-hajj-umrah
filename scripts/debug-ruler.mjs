import sharp from 'sharp'
import * as fs from 'fs'

const TPL = 'C:/Users/dell/OneDrive - Questindustries/Documents/BPKH/green-hajj-umrah-admin/storage/app/public/certificate-templates/a23605d5-228c-4726-af52-8490e8d6fb6b/carbon-market.jpg'
const OUT = 'public/certificates/debug-ruler.jpg'

const template = sharp(fs.readFileSync(TPL))
const { width: W, height: H } = await template.metadata()
console.log(`Template: ${W}x${H}`)

// Vertical lines at various X% to find the box left edge
const vLines = [8,10,12,14,16,18,20,22,24,26,28,30].map(p => {
  const x = Math.round(W * p / 100)
  return `<line x1="${x}" y1="630" x2="${x}" y2="870" stroke="red" stroke-width="2"/>
          <text x="${x}" y="625" font-size="16" fill="red" font-weight="bold">${p}%</text>`
}).join('')

// Horizontal lines to find box top/bottom
const hLines = [65,67,69,71,73,75,77,79,81,83].map(p => {
  const y = Math.round(H * p / 100)
  return `<line x1="100" y1="${y}" x2="${W-100}" y2="${y}" stroke="blue" stroke-width="1"/>
          <text x="108" y="${y+14}" font-size="14" fill="blue">${p}%</text>`
}).join('')

// Also mark right side X%
const vLinesRight = [82,84,86,88,90].map(p => {
  const x = Math.round(W * p / 100)
  return `<line x1="${x}" y1="630" x2="${x}" y2="870" stroke="green" stroke-width="2"/>
          <text x="${x}" y="625" font-size="16" fill="green" font-weight="bold">${p}%</text>`
}).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${vLines}
  ${vLinesRight}
  ${hLines}
</svg>`

await template
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .jpeg({ quality: 90 })
  .toFile(OUT)

console.log(`✅ Ruler saved: ${OUT}`)
console.log(`Open: http://localhost:3000/certificates/debug-ruler.jpg`)
