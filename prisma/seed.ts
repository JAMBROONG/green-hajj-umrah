import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with PG adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create Tenant: BPKH
  const bpkh = await prisma.tenants.upsert({
    where: { slug: 'bpkh' },
    update: {},
    create: {
      name: 'Badan Pengelola Keuangan Haji (BPKH)',
      slug: 'bpkh',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        language: 'id',
      },
      branding: {
        logo: '/logos/bpkh.png',
        primary_color: '#1E40AF',
        secondary_color: '#059669',
      },
    },
  });

  console.log('✅ Created tenant:', bpkh.name);

  // Create Tenant: Al-Hidayah Travel
  const alHidayah = await prisma.tenants.upsert({
    where: { slug: 'al-hidayah' },
    update: {},
    create: {
      name: 'Al-Hidayah Travel',
      slug: 'al-hidayah',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        language: 'id',
      },
      branding: {
        logo: '/logos/al-hidayah.png',
        primary_color: '#16A34A',
        secondary_color: '#CA8A04',
      },
    },
  });

  console.log('✅ Created tenant:', alHidayah.name);

  // Create Admin User
  const adminPassword = await hash('password', 10);
  const admin = await prisma.profiles.upsert({
    where: { email: 'admin@batsconsulting.com' },
    update: {},
    create: {
      tenant_id: null,
      full_name: 'Admin BATS Consulting',
      email: 'admin@batsconsulting.com',
      password: adminPassword,
      auth_provider: 'credentials',
      role: 'admin',
      metadata: {
        phone: '+62 812-3456-7890',
        position: 'System Administrator',
      },
    },
  });

  console.log('✅ Created admin:', admin.email);

  // Create Company User for BPKH
  const companyPassword = await hash('password', 10);
  const bpkhCompany = await prisma.profiles.upsert({
    where: { email: 'syarif@bpkh.go.id' },
    update: {},
    create: {
      tenant_id: bpkh.id,
      full_name: 'Muhammad Syarif',
      email: 'syarif@bpkh.go.id',
      password: companyPassword,
      auth_provider: 'credentials',
      role: 'company',
      metadata: {
        phone: '+62 812-9876-5432',
        position: 'Manager Operasional',
        department: 'Haji & Umrah',
      },
    },
  });

  console.log('✅ Created company user:', bpkhCompany.email);

  // Create Company User for Al-Hidayah
  const alHidayahCompany = await prisma.profiles.upsert({
    where: { email: 'fauzi@alhidayah.com' },
    update: {},
    create: {
      tenant_id: alHidayah.id,
      full_name: 'Ahmad Fauzi',
      email: 'fauzi@alhidayah.com',
      password: companyPassword,
      auth_provider: 'credentials',
      role: 'company',
      metadata: {
        phone: '+62 813-1234-5678',
        position: 'Owner & Director',
      },
    },
  });

  console.log('✅ Created company user:', alHidayahCompany.email);

  // Create Jemaah Users for BPKH
  const jemaahPassword = await hash('password', 10);
  const aminah = await prisma.profiles.upsert({
    where: { email: 'aminah@example.com' },
    update: {},
    create: {
      tenant_id: bpkh.id,
      full_name: 'Siti Aminah',
      email: 'aminah@example.com',
      password: jemaahPassword,
      auth_provider: 'credentials',
      role: 'jemaah',
      metadata: {
        phone: '+62 821-1111-2222',
        nik: '3201234567890001',
        birth_date: '1980-05-15',
        address: 'Jakarta Selatan, DKI Jakarta',
      },
    },
  });

  console.log('✅ Created jemaah:', aminah.email);

  const abdullah = await prisma.profiles.upsert({
    where: { email: 'abdullah@example.com' },
    update: {},
    create: {
      tenant_id: bpkh.id,
      full_name: 'Abdullah Rahman',
      email: 'abdullah@example.com',
      password: jemaahPassword,
      auth_provider: 'credentials',
      role: 'jemaah',
      metadata: {
        phone: '+62 822-3333-4444',
        nik: '3201234567890002',
        birth_date: '1975-08-20',
        address: 'Depok, Jawa Barat',
      },
    },
  });

  console.log('✅ Created jemaah:', abdullah.email);

  // Create Jemaah User for Al-Hidayah
  const fatimah = await prisma.profiles.upsert({
    where: { email: 'fatimah@example.com' },
    update: {},
    create: {
      tenant_id: alHidayah.id,
      full_name: 'Fatimah Zahra',
      email: 'fatimah@example.com',
      password: jemaahPassword,
      auth_provider: 'credentials',
      role: 'jemaah',
      metadata: {
        phone: '+62 823-5555-6666',
        nik: '3201234567890003',
        birth_date: '1985-03-10',
        address: 'Bandung, Jawa Barat',
      },
    },
  });

  console.log('✅ Created jemaah:', fatimah.email);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test Accounts (Password: password):');
  console.log('Admin: admin@batsconsulting.com / password');
  console.log('BPKH Company: syarif@bpkh.go.id / password');
  console.log('Al-Hidayah Company: fauzi@alhidayah.com / password');
  console.log('Jemaah (BPKH): aminah@example.com / password');
  console.log('Jemaah (BPKH): abdullah@example.com / password');
  console.log('Jemaah (Al-Hidayah): fatimah@example.com / password');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
