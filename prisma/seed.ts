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
    update: {
      phone: '021-12345678',
    },
    create: {
      name: 'Badan Pengelola Keuangan Haji (BPKH)',
      slug: 'bpkh',
      phone: '021-12345678',
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
    update: {
      phone: '081234567890',
    },
    create: {
      name: 'Al-Hidayah Travel',
      slug: 'al-hidayah',
      phone: '081234567890',
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

  // Create CSR Activities for BPKH
  const csrActivity1 = await prisma.csr_activities.upsert({
    where: { id: 'csr-001' },
    update: {},
    create: {
      id: 'csr-001',
      tenant_id: bpkh.id,
      title: 'Penanaman Pohon di Yogyakarta',
      description: 'Kegiatan penanaman 1000 pohon di kawasan Wonosari untuk restorasi hutan dan mengurangi emisi karbon. Peserta akan belajar tentang konservasi lingkungan sambil berkontribusi pada keberlanjutan planet.',
      category: 'reforestation',
      location: 'Wonosari, Yogyakarta',
      status: 'active',
      start_date: new Date('2026-04-10'),
      end_date: new Date('2026-04-20'),
      activity_date: new Date('2026-04-15'),
      total_donations_amount: 45000000,
      target_donation_amount: 75000000,
      image_url: '/csr/reforestation-yogya.jpg',
      contact_person: 'Ahmad Riyanto',
      contact_phone: '+62 821-5555-6666',
      contact_email: 'ahmad@bpkh.go.id',
      incentives: {
        certificate: true,
        carbon_credits: 50,
        meal_provided: true
      }
    }
  });

  const csrActivity2 = await prisma.csr_activities.upsert({
    where: { id: 'csr-002' },
    update: {},
    create: {
      id: 'csr-002',
      tenant_id: bpkh.id,
      title: 'Pembersihan Pantai & Program Sampah Plastik',
      description: 'Mari bersama-sama membersihkan pantai dari sampah plastik dan melakukan edukasi tentang pengurangan limbah plastik. Kegiatan ini bertujuan untuk melindungi ekosistem laut dan mengurangi jejak karbon.',
      category: 'waste_management',
      location: 'Pantai Ancol, Jakarta',
      status: 'active',
      start_date: new Date('2026-04-15'),
      end_date: new Date('2026-04-25'),
      activity_date: new Date('2026-04-20'),
      total_donations_amount: 32000000,
      target_donation_amount: 60000000,
      image_url: '/csr/beach-cleanup.jpg',
      contact_person: 'Siti Nurhaliza',
      contact_phone: '+62 822-7777-8888',
      contact_email: 'siti@bpkh.go.id',
      incentives: {
        certificate: true,
        carbon_credits: 30,
        mineral_water: true
      }
    }
  });

  const csrActivity3 = await prisma.csr_activities.upsert({
    where: { id: 'csr-003' },
    update: {},
    create: {
      id: 'csr-003',
      tenant_id: alHidayah.id,
      title: 'Workshop Energi Terbarukan & Solar Panel Installation',
      description: 'Workshop intensif tentang energi terbarukan dan hands-on training instalasi solar panel di rumah warga. Peserta akan belajar cara mengurangi konsumsi energi listrik sambil membantu masyarakat.',
      category: 'energy_efficiency',
      location: 'Depok, Jawa Barat',
      status: 'upcoming',
      start_date: new Date('2026-04-25'),
      end_date: new Date('2026-05-05'),
      activity_date: new Date('2026-05-01'),
      total_donations_amount: 0,
      target_donation_amount: 80000000,
      image_url: '/csr/solar-workshop.jpg',
      contact_person: 'Budi Santoso',
      contact_phone: '+62 823-9999-0000',
      contact_email: 'budi@alhidayah.com',
      incentives: {
        certificate: true,
        carbon_credits: 100,
        lunch_provided: true,
        training_material: true
      }
    }
  });

  const csrActivity4 = await prisma.csr_activities.upsert({
    where: { id: 'csr-004' },
    update: {},
    create: {
      id: 'csr-004',
      tenant_id: alHidayah.id,
      title: 'Program Konservasi Air & Rainwater Harvesting',
      description: 'Pelatihan dan implementasi sistem rainwater harvesting di sekolah-sekolah untuk konservasi air dan mengurangi beban air tanah. Kegiatan edukatif untuk generasi muda tentang pentingnya air bersih.',
      category: 'water_conservation',
      location: 'Bandung, Jawa Barat',
      status: 'completed',
      start_date: new Date('2026-03-08'),
      end_date: new Date('2026-03-15'),
      activity_date: new Date('2026-03-10'),
      total_donations_amount: 50000000,
      target_donation_amount: 50000000,
      image_url: '/csr/water-conservation.jpg',
      contact_person: 'Rina Wijaya',
      contact_phone: '+62 824-1111-2222',
      contact_email: 'rina@alhidayah.com',
      incentives: {
        certificate: true,
        carbon_credits: 40,
        t_shirt: true
      }
    }
  });

  console.log('✅ Created CSR Activity:', csrActivity1.title);
  console.log('✅ Created CSR Activity:', csrActivity2.title);
  console.log('✅ Created CSR Activity:', csrActivity3.title);
  console.log('✅ Created CSR Activity:', csrActivity4.title);

  // Add more CSR Activities for BPKH
  const csrActivity5 = await prisma.csr_activities.upsert({
    where: { id: 'csr-005' },
    update: {},
    create: {
      id: 'csr-005',
      tenant_id: bpkh.id,
      title: 'Edukasi Literasi Lingkungan di Sekolah',
      description: 'Program edukasi mencakup workshop, diskusi, dan kegiatan praktis tentang pelestarian lingkungan, pengurangan limbah, dan gaya hidup berkelanjutan untuk pelajar.',
      category: 'reforestation',
      location: 'Jakarta Pusat',
      status: 'upcoming',
      start_date: new Date('2026-05-10'),
      end_date: new Date('2026-05-20'),
      activity_date: new Date('2026-05-15'),
      total_donations_amount: 0,
      target_donation_amount: 35000000,
      image_url: '/csr/education-green.jpg',
      contact_person: 'Dr. Mahendra',
      contact_phone: '+62 821-1234-5678',
      contact_email: 'mahendra@bpkh.go.id',
      incentives: {
        certificate: true,
        carbon_credits: 20,
        educational_materials: true
      }
    }
  });

  const csrActivity6 = await prisma.csr_activities.upsert({
    where: { id: 'csr-006' },
    update: {},
    create: {
      id: 'csr-006',
      tenant_id: bpkh.id,
      title: 'Audit Energi & Efisiensi Gedung',
      description: 'Kegiatan audit energi di berbagai gedung publik untuk mengidentifikasi peluang penghematan energi dan implementasi solusi ramah lingkungan.',
      category: 'energy_efficiency',
      location: 'Jakarta',
      status: 'completed',
      start_date: new Date('2026-02-01'),
      end_date: new Date('2026-02-20'),
      activity_date: new Date('2026-02-10'),
      total_donations_amount: 42000000,
      target_donation_amount: 42000000,
      image_url: '/csr/energy-audit.jpg',
      contact_person: 'Ir. Budiman',
      contact_phone: '+62 822-2345-6789',
      contact_email: 'budiman@bpkh.go.id',
      incentives: {
        certificate: true,
        carbon_credits: 60,
        report_provided: true
      }
    }
  });

  // Add more CSR Activities for Al-Hidayah
  const csrActivity7 = await prisma.csr_activities.upsert({
    where: { id: 'csr-007' },
    update: {},
    create: {
      id: 'csr-007',
      tenant_id: alHidayah.id,
      title: 'Program Penanaman Mangrove Pantai',
      description: 'Kegiatan penanaman mangrove di kawasan pantai untuk restorasi ekosistem laut, pencegahan abrasi, dan penyerapan karbon. Edukasi tentang pentingnya mangrove bagi lingkungan laut.',
      category: 'reforestation',
      location: 'Tangerang Selatan',
      status: 'active',
      start_date: new Date('2026-04-12'),
      end_date: new Date('2026-04-25'),
      activity_date: new Date('2026-04-18'),
      total_donations_amount: 40000000,
      target_donation_amount: 70000000,
      image_url: '/csr/mangrove-planting.jpg',
      contact_person: 'Hendri Kusuma',
      contact_phone: '+62 824-3456-7890',
      contact_email: 'hendri@alhidayah.com',
      incentives: {
        certificate: true,
        carbon_credits: 75,
        lunch_provided: true
      }
    }
  });

  const csrActivity8 = await prisma.csr_activities.upsert({
    where: { id: 'csr-008' },
    update: {},
    create: {
      id: 'csr-008',
      tenant_id: alHidayah.id,
      title: 'Pelatihan Pertanian Organik Berkelanjutan',
      description: 'Program pelatihan teknik bertani organik, penggunaan pupuk alami, dan pengelolaan lahan berkelanjutan kepada petani lokal untuk meningkatkan produktivitas dan mengurangi dampak lingkungan.',
      category: 'water_conservation',
      location: 'Bogor',
      status: 'upcoming',
      start_date: new Date('2026-05-05'),
      end_date: new Date('2026-05-10'),
      activity_date: new Date('2026-05-07'),
      total_donations_amount: 0,
      target_donation_amount: 45000000,
      image_url: '/csr/organic-farming.jpg',
      contact_person: 'Bapak Tarno',
      contact_phone: '+62 825-4567-8901',
      contact_email: 'tarno@alhidayah.com',
      incentives: {
        certificate: true,
        carbon_credits: 35,
        training_seed_provided: true
      }
    }
  });

  console.log('✅ Created CSR Activity:', csrActivity5.title);
  console.log('✅ Created CSR Activity:', csrActivity6.title);
  console.log('✅ Created CSR Activity:', csrActivity7.title);
  console.log('✅ Created CSR Activity:', csrActivity8.title);

  // Create Carbon Products
  await prisma.carbon_products.upsert({
    where: { id: 'cp-001' },
    update: {},
    create: {
      id: 'cp-001',
      product_code: 'CP001',
      name: 'Tree Planting Package - Small',
      description: 'Plant 10 trees and offset 1 ton of CO2',
      price: '100000.00',
      project: 'Reforestation Initiative',
      category: 'reforestation',
      image_url: 'https://via.placeholder.com/300?text=Trees',
      is_active: true,
    },
  });

  await prisma.carbon_products.upsert({
    where: { id: 'cp-002' },
    update: {},
    create: {
      id: 'cp-002',
      product_code: 'CP002',
      name: 'Tree Planting Package - Medium',
      description: 'Plant 25 trees and offset 2.5 tons of CO2',
      price: '250000.00',
      project: 'Reforestation Initiative',
      category: 'reforestation',
      image_url: 'https://via.placeholder.com/300?text=More+Trees',
      is_active: true,
    },
  });

  await prisma.carbon_products.upsert({
    where: { id: 'cp-003' },
    update: {},
    create: {
      id: 'cp-003',
      product_code: 'CP003',
      name: 'Solar Panel Installation',
      description: 'Support solar panel installation offsetting 5 tons of CO2 annually',
      price: '500000.00',
      project: 'Renewable Energy Program',
      category: 'renewable_energy',
      image_url: 'https://via.placeholder.com/300?text=Solar',
      is_active: true,
    },
  });

  await prisma.carbon_products.upsert({
    where: { id: 'cp-004' },
    update: {},
    create: {
      id: 'cp-004',
      product_code: 'CP004',
      name: 'Waste Management Program',
      description: 'Support waste reduction initiatives offsetting 2 tons of CO2',
      price: '150000.00',
      project: 'Circular Economy Project',
      category: 'waste_reduction',
      image_url: 'https://via.placeholder.com/300?text=Recycling',
      is_active: true,
    },
  });

  console.log('✅ Created Carbon Products');

  // Create Tenant Payment Configs for Midtrans
  const bpkhPaymentConfig = await prisma.tenantPaymentConfig.upsert({
    where: { tenant_id: bpkh.id },
    update: {
      midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-RKsqgPDSSn86BM5O',
      midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
      midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G454324030',
      is_production: true,
      enabled: true,
    },
    create: {
      tenant_id: bpkh.id,
      midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-RKsqgPDSSn86BM5O',
      midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
      midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G454324030',
      is_production: true,
      enabled: true,
    },
  });

  console.log('✅ Created Payment Config for BPKH');

  const alHidayahPaymentConfig = await prisma.tenantPaymentConfig.upsert({
    where: { tenant_id: alHidayah.id },
    update: {
      midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-RKsqgPDSSn86BM5O',
      midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
      midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G454324030',
      is_production: true,
      enabled: true,
    },
    create: {
      tenant_id: alHidayah.id,
      midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-RKsqgPDSSn86BM5O',
      midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
      midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G454324030',
      is_production: true,
      enabled: true,
    },
  });

  console.log('✅ Created Payment Config for Al-Hidayah');

  // Create Global Carbon Payment Config for Midtrans (Carbon Product Purchases)
  // This is now a single global config, not per-tenant
  const existingCarbonConfig = await prisma.carbonPaymentConfig.findFirst();
  
  if (existingCarbonConfig) {
    // Update existing config
    await prisma.carbonPaymentConfig.update({
      where: { id: existingCarbonConfig.id },
      data: {
        midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-RKsqgPDSSn86BM5O',
        midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
        midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G454324030',
        is_production: true,
        enabled: true,
      },
    });
    console.log('✅ Updated Global Carbon Payment Config');
  } else {
    // Create new config if doesn't exist
    await prisma.carbonPaymentConfig.create({
      data: {
        midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-RKsqgPDSSn86BM5O',
        midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-Aqga0kM5mF4omcLejZV68Dmh',
        midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G454324030',
        is_production: true,
        enabled: true,
      },
    });
    console.log('✅ Created Global Carbon Payment Config');
  }

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
