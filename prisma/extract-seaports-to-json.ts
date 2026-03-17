import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

type ParsedSeaport = {
  source_id: number;
  name: string;
  alias_name: string | null;
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
  address: string | null;
  country_id: number | null;
  country_code: string;
};

function normalizeString(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
  return cleaned.length ? cleaned : null;
}

function extractString(block: string, key: string): string | null {
  const match = block.match(new RegExp(`"${key}"\\s*=>\\s*"([\\s\\S]*?)"`));
  return normalizeString(match?.[1]);
}

function extractNumber(block: string, key: string): number | null {
  const match = block.match(new RegExp(`"${key}"\\s*=>\\s*([-+]?[0-9]*\\.?[0-9]+)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseSeaportsFromSeeder(content: string): ParsedSeaport[] {
  const itemBlocks = [...content.matchAll(/array\(\s*"id"\s*=>[\s\S]*?\),/g)].map((m) => m[0]);

  return itemBlocks
    .map((block) => {
      const source_id = extractNumber(block, 'id');
      const name = extractString(block, 'name');
      const latitude = extractNumber(block, 'latitude');
      const longitude = extractNumber(block, 'longitude');

      if (!source_id || !name || latitude === null || longitude === null) {
        return null;
      }

      return {
        source_id,
        name,
        alias_name: extractString(block, 'name2'),
        latitude,
        longitude,
        province: extractString(block, 'province'),
        city: extractString(block, 'city'),
        address: extractString(block, 'address'),
        country_id: extractNumber(block, 'country_id'),
        country_code: 'ID'
      } satisfies ParsedSeaport;
    })
    .filter((item): item is ParsedSeaport => Boolean(item));
}

async function main() {
  const seederPath = process.argv[2];
  const outputPath = path.join(__dirname, '../public/seaports.json');

  if (!seederPath) {
    throw new Error('Path file seeder Laravel wajib diisi. Contoh: npm run db:extract-seaports -- "/path/SeaportSeeder.php"');
  }

  if (!existsSync(seederPath)) {
    throw new Error(`File tidak ditemukan: ${seederPath}`);
  }

  try {
    const content = readFileSync(seederPath, 'utf-8');
    const seaports = parseSeaportsFromSeeder(content);

    if (!seaports.length) {
      throw new Error('Tidak ada data pelabuhan yang berhasil diparse dari seeder Laravel.');
    }

    writeFileSync(outputPath, JSON.stringify(seaports, null, 2), 'utf-8');

    console.log(`✅ Extract seaports selesai: ${seaports.length} data`);
    console.log(`📄 File JSON tersimpan di: ${outputPath}`);
  } catch (error) {
    console.error('❌ Gagal extract seaports dari seeder Laravel:', error);
    process.exit(1);
  }
}

main();
