const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public';

const connectionString = process.env.DATABASE_URL || DEFAULT_DEV_DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // Create sample carbon products conforming to the new SRN standards
    const products = [
      {
        id: 'cp-001',
        name: 'Proyek Reforestasi Lahan Gambut Kalimantan',
        description: 'Restorasi 1.000 hektar lahan gambut untuk mencegah emisi karbon dan pemulihan ekosistem.',
        image_url: 'https://via.placeholder.com/300?text=Gambut',
        location: 'Kalimantan Tengah, Indonesia',
        project_owner: 'PT Restorasi Alam Asri',
        srn_series: 'IDNBS',
        vintage: '2023',
        listed_date: new Date('2023-05-15T00:00:00Z'),
        listed_volume: [{ year: '2023', volume: '15000' }],
        is_active: true,
      },
      {
        id: 'cp-002',
        name: 'Pembangkit Listrik Tenaga Surya Atap Bali',
        description: 'Instalasi panel surya berskala besar untuk mensuplai 30 MW listrik terbarukan.',
        image_url: 'https://via.placeholder.com/300?text=Solar',
        location: 'Bali, Indonesia',
        project_owner: 'Green Energy Nusantara',
        srn_series: 'IDTBS-RE',
        vintage: '2024',
        listed_date: new Date('2024-01-10T00:00:00Z'),
        listed_volume: [{ year: '2024', volume: '45000' }],
        is_active: true,
      },
      {
        id: 'cp-003',
        name: 'Konservasi Hutan Mangrove Papua',
        description: 'Perlindungan area hutan mangrove yang esensial untuk keanekaragaman hayati.',
        image_url: 'https://via.placeholder.com/300?text=Mangrove',
        location: 'Papua, Indonesia',
        project_owner: 'Mangrove Lestari Foundation',
        srn_series: 'IDNBS',
        vintage: '2022',
        listed_date: new Date('2022-11-20T00:00:00Z'),
        listed_volume: [{ year: '2022', volume: '8000' }, { year: '2023', volume: '11000' }],
        is_active: true,
      },
      {
        id: 'cp-004',
        name: 'Pengolahan Limbah Menjadi Biogas Jawa Barat',
        description: 'Mengkonversi limbah organik agrikultur menjadi biogas, menekan emisi metana.',
        image_url: 'https://via.placeholder.com/300?text=Biogas',
        location: 'Jawa Barat, Indonesia',
        project_owner: 'BioTech Agri Indonesia',
        srn_series: 'IDTBS',
        vintage: '2023',
        listed_date: new Date('2023-08-05T00:00:00Z'),
        listed_volume: [{ year: '2023', volume: '25000' }],
        is_active: true,
      },
    ];

    for (const product of products) {
      try {
        const existing = await prisma.carbon_products.findUnique({
          where: { id: product.id }
        });
        
        if (!existing) {
          await prisma.carbon_products.create({
            data: product
          });
          console.log(`✓ Created carbon product: ${product.name}`);
        } else {
          // Update the existing product to match the new structure
          await prisma.carbon_products.update({
            where: { id: product.id },
            data: product
          });
          console.log(`✓ Updated carbon product: ${product.name}`);
        }
      } catch (e) {
        console.error(`✗ Error creating product ${product.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
