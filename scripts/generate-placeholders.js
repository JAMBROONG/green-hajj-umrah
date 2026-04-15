/**
 * generate-placeholders.js
 * Creates solid-color placeholder PNG files for icons and splash screens.
 * Run: node scripts/generate-placeholders.js
 * Replace the outputs with real assets from the designer.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC-32 table (IEEE polynomial)
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.alloc(0);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(d.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])), 0);
  return Buffer.concat([len, t, d, crcBuf]);
}

function createPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: RGB
  // bytes 10-12 = 0 (compression, filter, interlace)

  // Build raw scanlines: filter_byte(0) + R G B per pixel
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(height * rowBytes);
  // filter bytes are already 0; fill colour
  for (let y = 0; y < height; y++) {
    const base = y * rowBytes + 1;
    for (let x = 0; x < width; x++) {
      raw[base + x * 3]     = r;
      raw[base + x * 3 + 1] = g;
      raw[base + x * 3 + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const base = path.join(__dirname, '..', 'public');

// Emerald green #10b981 = RGB(16, 185, 129)
const GREEN = [16, 185, 129];
// White for splash screens
const WHITE = [255, 255, 255];

const files = [
  // Icons
  { dir: 'icons', name: 'icon-192x192.png',          w: 192,  h: 192,  c: GREEN },
  { dir: 'icons', name: 'icon-512x512.png',          w: 512,  h: 512,  c: GREEN },
  { dir: 'icons', name: 'icon-maskable-192x192.png', w: 192,  h: 192,  c: GREEN },
  { dir: 'icons', name: 'icon-maskable-512x512.png', w: 512,  h: 512,  c: GREEN },
  { dir: 'icons', name: 'apple-touch-icon.png',      w: 180,  h: 180,  c: GREEN },
  // Splash screens (white background)
  { dir: 'splash', name: 'splash-1170x2532.png', w: 1170, h: 2532, c: WHITE },
  { dir: 'splash', name: 'splash-1125x2436.png', w: 1125, h: 2436, c: WHITE },
  { dir: 'splash', name: 'splash-828x1792.png',  w: 828,  h: 1792, c: WHITE },
  { dir: 'splash', name: 'splash-750x1334.png',  w: 750,  h: 1334, c: WHITE },
  { dir: 'splash', name: 'splash-1290x2796.png', w: 1290, h: 2796, c: WHITE },
];

for (const f of files) {
  const dir = path.join(base, f.dir);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, f.name);

  // Skip if already exists with real content (> 5KB likely means real image)
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
    console.log(`SKIP  ${f.dir}/${f.name}  (already exists, likely real asset)`);
    continue;
  }

  process.stdout.write(`GEN   ${f.dir}/${f.name}  (${f.w}x${f.h}) ... `);
  const png = createPNG(f.w, f.h, f.c[0], f.c[1], f.c[2]);
  fs.writeFileSync(outPath, png);
  console.log(`${(png.length / 1024).toFixed(1)} KB`);
}

console.log('\nDone! Replace these files with real assets from the designer.');
