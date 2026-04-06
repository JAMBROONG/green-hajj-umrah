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
    console.log('🌱 Starting database seeding...\n');

    // 1. Create tenants
    console.log('📦 Creating tenants...');
    let tenant1 = await prisma.tenants.findUnique({
      where: { slug: 'org-1' }
    });
    
    if (!tenant1) {
      tenant1 = await prisma.tenants.create({
        data: {
          name: 'Green Indonesia Organization',
          slug: 'org-1',
          settings: { country: 'Indonesia' },
          branding: { primary_color: '#10b981' }
        }
      });
      console.log(`  ✓ Created tenant: ${tenant1.name} (${tenant1.id})`);
    } else {
      console.log(`  ✓ Tenant already exists: ${tenant1.name}`);
    }

    let tenant2 = await prisma.tenants.findUnique({
      where: { slug: 'org-2' }
    });
    
    if (!tenant2) {
      tenant2 = await prisma.tenants.create({
        data: {
          name: 'Eco Impact Foundation',
          slug: 'org-2',
          settings: { country: 'Indonesia' },
          branding: { primary_color: '#059669' }
        }
      });
      console.log(`  ✓ Created tenant: ${tenant2.name} (${tenant2.id})`);
    } else {
      console.log(`  ✓ Tenant already exists: ${tenant2.name}`);
    }

    // 2. Create users (profiles)
    console.log('\n👥 Creating users...');
    const users = [
      {
        email: 'admin@org1.com',
        full_name: 'Admin Org 1',
        password: '$2a$10$KIXxPfxFY68p4mw9nJ7Rhe.m3XVDfSlBqg3vxDgQd6i6DkO/BtF0O', // password123
        role: 'admin',
        tenant_id: tenant1.id,
      },
      {
        email: 'user@org1.com',
        full_name: 'User Org 1',
        password: '$2a$10$KIXxPfxFY68p4mw9nJ7Rhe.m3XVDfSlBqg3vxDgQd6i6DkO/BtF0O', // password123
        role: 'jemaah',
        tenant_id: tenant1.id,
      },
      {
        email: 'csr@org1.com',
        full_name: 'CSR Manager',
        password: '$2a$10$KIXxPfxFY68p4mw9nJ7Rhe.m3XVDfSlBqg3vxDgQd6i6DkO/BtF0O', // password123
        role: 'csr_manager',
        tenant_id: tenant1.id,
      },
      {
        email: 'admin@org2.com',
        full_name: 'Admin Org 2',
        password: '$2a$10$KIXxPfxFY68p4mw9nJ7Rhe.m3XVDfSlBqg3vxDgQd6i6DkO/BtF0O', // password123
        role: 'admin',
        tenant_id: tenant2.id,
      },
    ];

    for (const userData of users) {
      const existingUser = await prisma.profiles.findUnique({
        where: { email: userData.email }
      });
      
      if (!existingUser) {
        await prisma.profiles.create({
          data: userData
        });
        console.log(`  ✓ Created user: ${userData.full_name} (${userData.email})`);
      } else {
        console.log(`  ✓ User already exists: ${userData.email}`);
      }
    }

    // 3. Create payment config
    console.log('\n💳 Creating payment configs...');
    const paymentConfigs = [
      {
        tenant_id: tenant1.id,
        midtrans_server_key: 'SB-Mid-server-test123456',
        midtrans_merchant_id: 'M123456',
        midtrans_client_key: 'SB-Mid-client-test123456',
        is_production: false,
        enabled: true,
      },
      {
        tenant_id: tenant2.id,
        midtrans_server_key: 'SB-Mid-server-test789012',
        midtrans_merchant_id: 'M789012',
        midtrans_client_key: 'SB-Mid-client-test789012',
        is_production: false,
        enabled: true,
      }
    ];

    for (const config of paymentConfigs) {
      const existing = await prisma.tenantPaymentConfig.findUnique({
        where: { tenant_id: config.tenant_id }
      });
      
      if (!existing) {
        await prisma.tenantPaymentConfig.create({
          data: config
        });
        console.log(`  ✓ Created payment config for tenant: ${config.tenant_id}`);
      } else {
        console.log(`  ✓ Payment config already exists for tenant: ${config.tenant_id}`);
      }
    }

    // 4. Create carbon products
    console.log('\n🌍 Creating carbon products...');
    const products = [
      {
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
      {
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
      {
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
      {
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
    ];

    for (const product of products) {
      const existing = await prisma.carbon_products.findUnique({
        where: { id: product.id }
      });
      
      if (!existing) {
        await prisma.carbon_products.create({
          data: product
        });
        console.log(`  ✓ Created product: ${product.name}`);
      } else {
        console.log(`  ✓ Product already exists: ${product.name}`);
      }
    }

    // 5. Create CSR activities
    console.log('\n♻️  Creating CSR activities...');
    const activities = [
      {
        id: 'csr-001',
        tenant_id: tenant1.id,
        title: 'Penanaman Pohon Bersama',
        description: 'Program penanaman pohon untuk reboisasi area terbuka di Jakarta Timur',
        category: 'reforestation',
        location: 'Jakarta Timur',
        status: 'active',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2026-04-30'),
        activity_date: new Date('2026-04-20'),
        participants_count: 50,
        image_url: 'https://via.placeholder.com/300?text=Trees',
        contact_person: 'Budi Santoso',
        contact_phone: '081234567890',
        contact_email: 'budi@org1.com',
      },
      {
        id: 'csr-002',
        tenant_id: tenant1.id,
        title: 'Program Pengurangan Sampah',
        description: 'Kampanye edukasi dan praktik pengurangan sampah plastik di komunitas',
        category: 'waste_management',
        location: 'Jakarta Pusat',
        status: 'active',
        start_date: new Date('2026-04-15'),
        end_date: new Date('2026-05-15'),
        activity_date: new Date('2026-04-25'),
        participants_count: 100,
        image_url: 'https://via.placeholder.com/300?text=Recycling',
        contact_person: 'Siti Nurhaliza',
        contact_phone: '082345678901',
        contact_email: 'siti@org1.com',
      },
      {
        id: 'csr-003',
        tenant_id: tenant1.id,
        title: 'Efisiensi Energi di Sekolah',
        description: 'Pemasangan panel surya dan edukasi efisiensi energi di sekolah-sekolah',
        category: 'energy_efficiency',
        location: 'Jakarta Selatan',
        status: 'upcoming',
        start_date: new Date('2026-05-01'),
        end_date: new Date('2026-05-31'),
        activity_date: new Date('2026-05-15'),
        participants_count: 30,
        image_url: 'https://via.placeholder.com/300?text=Solar',
        contact_person: 'Ahmad Wijaya',
        contact_phone: '083456789012',
        contact_email: 'ahmad@org1.com',
      },
      {
        id: 'csr-004',
        tenant_id: tenant2.id,
        title: 'Konservasi Air Bersih',
        description: 'Program pembangunan sistem panen air hujan di wilayah kering',
        category: 'water_conservation',
        location: 'Jakarta Utara',
        status: 'completed',
        start_date: new Date('2026-02-01'),
        end_date: new Date('2026-03-31'),
        activity_date: new Date('2026-03-15'),
        participants_count: 75,
        image_url: 'https://via.placeholder.com/300?text=Water',
        contact_person: 'Ratna Kumala',
        contact_phone: '084567890123',
        contact_email: 'ratna@org2.com',
      },
    ];

    for (const activity of activities) {
      const existing = await prisma.csr_activities.findUnique({
        where: { id: activity.id }
      });
      
      if (!existing) {
        await prisma.csr_activities.create({
          data: activity
        });
        console.log(`  ✓ Created activity: ${activity.title}`);
      } else {
        console.log(`  ✓ Activity already exists: ${activity.title}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📋 Test Credentials:');
    console.log('   Email: admin@org1.com | Password: password123');
    console.log('   Email: user@org1.com | Password: password123');
    console.log('   Email: csr@org1.com | Password: password123');
    console.log('   Email: admin@org2.com | Password: password123\n');

  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
