import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const AIRPORTS = [
  // Indonesia Airports
  { name: 'Soekarno-Hatta International Airport', iata: 'CGK', icao: 'WIII', country: 'Indonesia', lat: -6.1256, lon: 106.6560 },
  { name: 'Juanda International Airport', iata: 'SUB', icao: 'WARR', country: 'Indonesia', lat: -7.3798, lon: 112.7869 },
  { name: 'Ngurah Rai International Airport', iata: 'DPS', icao: 'WADD', country: 'Indonesia', lat: -8.7467, lon: 115.1671 },
  { name: 'Sultan Hasanuddin International Airport', iata: 'UPG', icao: 'WALL', country: 'Indonesia', lat: -5.0616, lon: 119.5540 },
  { name: 'Kualanamu International Airport', iata: 'KNO', icao: 'WIII', country: 'Indonesia', lat: 3.6422, lon: 98.8853 },
  { name: 'Husein Sastranegara International Airport', iata: 'BDO', icao: 'WICC', country: 'Indonesia', lat: -6.9006, lon: 107.5764 },
  { name: 'Sultan Mahmud Badaruddin II Airport', iata: 'PLM', icao: 'WIPC', country: 'Indonesia', lat: -2.8976, lon: 104.6997 },
  { name: 'Sultan Aji Muhammad Sulaiman Airport', iata: 'BPN', icao: 'WIBB', country: 'Indonesia', lat: -1.2683, lon: 116.8945 },
  { name: 'Sultan Syarif Kasim II Airport', iata: 'PKU', icao: 'WIPL', country: 'Indonesia', lat: 0.4608, lon: 101.4450 },
  { name: 'Adisumarmo International Airport', iata: 'SOC', icao: 'WISS', country: 'Indonesia', lat: -7.5161, lon: 110.7569 },
  { name: 'Adisucipto International Airport', iata: 'JOG', icao: 'WIIS', country: 'Indonesia', lat: -7.7881, lon: 110.4317 },
  { name: 'Ahmad Yani International Airport', iata: 'SRG', icao: 'WISN', country: 'Indonesia', lat: -6.9714, lon: 110.3750 },
  { name: 'Minangkabau International Airport', iata: 'PDG', icao: 'WIPM', country: 'Indonesia', lat: -0.7868, lon: 100.2808 },
  { name: 'Hang Nadim International Airport', iata: 'BTH', icao: 'WIDD', country: 'Indonesia', lat: 1.1210, lon: 104.1186 },

  // Saudi Arabia Airports
  { name: 'King Abdulaziz International Airport', iata: 'JED', icao: 'OEJN', country: 'Saudi Arabia', lat: 21.6796, lon: 39.1564 },
  { name: 'Prince Mohammad bin Abdulaziz Airport', iata: 'MED', icao: 'OEMA', country: 'Saudi Arabia', lat: 24.5534, lon: 39.7050 },
  { name: 'King Khalid International Airport', iata: 'RUH', icao: 'OERK', country: 'Saudi Arabia', lat: 24.9577, lon: 46.6988 },
  { name: 'King Fahd International Airport', iata: 'DMM', icao: 'OEDF', country: 'Saudi Arabia', lat: 26.4712, lon: 49.7979 },
  { name: 'Tabuk Regional Airport', iata: 'TUU', icao: 'OEPA', country: 'Saudi Arabia', lat: 28.3654, lon: 36.6189 },
  { name: 'Abha Regional Airport', iata: 'AHB', icao: 'OEAB', country: 'Saudi Arabia', lat: 18.2404, lon: 42.6566 },
  { name: 'Taif Regional Airport', iata: 'TIF', icao: 'OETF', country: 'Saudi Arabia', lat: 21.4834, lon: 40.5444 },
];

async function main() {
  console.log('🌱 Seeding airports...');

  try {
    // Delete existing airports
    await prisma.airports.deleteMany({});
    console.log('🗑️  Cleared existing airports');

    // Create new airports
    for (const airport of AIRPORTS) {
      const created = await prisma.airports.create({
        data: airport,
      });
      console.log(`✅ Created airport: ${created.iata} - ${created.name}`);
    }
    console.log(`✅ Total ${AIRPORTS.length} airports seeded!`);
  } catch (error) {
    console.error('❌ Error seeding airports:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
