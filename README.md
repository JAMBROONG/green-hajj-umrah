# Green Hajj & Umrah - Kalkulator Emisi CO2e

Aplikasi mobile-first untuk menghitung dan mengelola jejak karbon (emisi CO2e) dari perjalanan ibadah Hajj dan Umrah, dengan fitur offset karbon melalui IDX Carbon Market.

## 📱 Fitur Utama

- **Dashboard**: Overview total emisi dan progress tahapan
- **9 Tahapan Perjalanan**: 
  - Pra-keberangkatan (Asrama)
  - Penerbangan ID → KSA
  - Madinah (8 hari)
  - Makkah
  - Arafah
  - Muzdalifah
  - Mina (Tasyrik)
  - Rekreasi
  - Pulang (KSA → ID)
  
- **4 Kategori Emisi**:
  - 🚌 Transportasi (bus, mobil, kereta, pesawat)
  - 🏨 Energi & Akomodasi (hotel 3-5 bintang)
  - 🍽️ Konsumsi (berbagai jenis makanan)
  - ♻️ Limbah (sampah & waste)

- **Pasar Karbon IDX**: Beli kredit karbon untuk offset emisi
- **Analitik**: Breakdown emisi per tahapan dan kategori
- **Sertifikat**: Sertifikat partisipasi dari BPKH & BATS Consulting

## 🎨 Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 (Docker)
- **ORM**: Prisma 7
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS 4
- **UI/UX**: Mobile-first (max-width: 430px)
- **Font**: Plus Jakarta Sans
- **PWA**: @serwist/next untuk Progressive Web App

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm/yarn/pnpm/bun

### Installation

```bash
# Clone repository
git clone <repository-url>
cd green-hajj-umrah

# Install dependencies
npm install

# Start development (auto-starts PostgreSQL + migrations)
./start-dev.sh
```

Or manually:

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
cd green-hajj-umrah

# Install dependencies
npm install

# Run development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 📂 Struktur Project

```
green-hajj-umrah/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard
│   │   ├── phases/
│   │   │   ├── page.tsx                # Daftar tahapan
│   │   │   └── [phaseId]/
│   │   │       ├── page.tsx            # Detail tahapan
│   │   │       └── [categoryId]/
│   │   │           └── page.tsx        # Input kategori
│   │   ├── carbon-market/
│   │   │   └── page.tsx                # Pasar karbon
│   │   ├── checkout/
│   │   │   └── [productId]/
│   │   │       └── page.tsx            # Checkout
│   │   ├── success/
│   │   │   └── page.tsx                # Success page
│   │   ├── analytics/
│   │   │   └── page.tsx                # Analytics
│   │   ├── certificate/
│   │   │   └── page.tsx                # Certificate
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── StatusBar.tsx               # Status bar atas
│   │   ├── BottomNav.tsx               # Bottom navigation
│   │   ├── Toast.tsx                   # Toast notification
│   │   └── forms/
│   │       ├── TransportForm.tsx       # Form transportasi
│   │       ├── EnergyForm.tsx          # Form energi
│   │       ├── FoodForm.tsx            # Form konsumsi
│   │       └── WasteForm.tsx           # Form limbah
│   ├── hooks/
│   │   └── useHajiJourney.ts           # Hook untuk state management
│   └── lib/
│       ├── constants.ts                # Konstanta & definisi
│       ├── types.ts                    # TypeScript types
│       └── utils.ts                    # Utility functions
├── public/
│   └── manifest.json                   # PWA manifest
├── dev-docs/
│   └── index.html                      # Prototype HTML (referensi)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.mjs
└── README.md
```

## 🎯 Cara Penggunaan

1. **Dashboard**: Lihat total emisi dan progress tahapan
2. **Isi Data Emisi**: Klik "Isi Data Emisi" atau menu Tahapan
3. **Pilih Tahapan**: Pilih salah satu dari 8 tahapan perjalanan
4. **Input Kategori**: Isi data untuk setiap kategori emisi:
   - Transportasi: Pilih kendaraan & jarak tempuh
   - Energi: Pilih hotel & jumlah hari
   - Konsumsi: Pilih jenis makanan, makan/hari, dan durasi
   - Limbah: Estimasi berat limbah
5. **Analitik**: Lihat breakdown emisi di halaman Analytics
6. **Offset Karbon**: Beli kredit karbon dari IDX Carbon Market
7. **Sertifikat**: Dapatkan sertifikat partisipasi

## 💾 Data Storage

Data disimpan di LocalStorage dengan key `greenHajPhases`:

```typescript
{
  currentPhase: number,
  phases: {
    [phaseId]: {
      completed: boolean,
      categories: {
        [categoryId]: {
          completed: boolean,
          emission: number,        // dalam kg CO2e
          details: { ... }
        }
      }
    }
  }
}
```

## 🌍 Emisi Factors

Faktor emisi yang digunakan:

### Transport
- Bus: 0.089 kg CO2e/km
- Mobil: 0.171 kg CO2e/km
- Kereta: 0.041 kg CO2e/km
- Penerbangan: 1500 kg CO2e/perjalanan

### Hotel (per hari)
- 3 Bintang: 15 kg CO2e
- 4 Bintang: 22 kg CO2e
- 5 Bintang: 35 kg CO2e

### Food (per meal)
- Nasi & Ayam: 1.2 kg CO2e
- Daging Sapi: 6.0 kg CO2e
- Ikan: 1.5 kg CO2e
- Vegetarian: 0.5 kg CO2e

### Waste
- 0.5 kg CO2e per kg limbah

## 🛒 Carbon Products (IDX)

- **IDTBS**: Rp 58.800/tCO2e (Restorasi Gambut)
- **IDTBS-RE**: Rp 73.200/tCO2e (PLTS & PLTB)
- **IDTBSA**: Rp 95.000/tCO2e (Konservasi Hutan)
- **IDTBSA-RE**: Rp 144.000/tCO2e (Energi Hijau Premium)

## 🎨 Design System

### Colors
- Primary: `#0D6E4F`
- Primary Dark: `#095A42`
- Primary Light: `#E8F5F0`
- Text Dark: `#1A2E23`
- Text Muted: `#6B7C74`
- Border: `#E2E8E5`

### Typography
- Font Family: Plus Jakarta Sans
- Weights: 400, 500, 600, 700, 800

### Spacing
- Container: max-width 430px (mobile-optimized)
- Padding: consistently 20px (px-5)

## 📝 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

Project ini dikembangkan untuk BPKH (Badan Pengelola Keuangan Haji) dengan dukungan teknologi dari BATS Consulting.

## 📄 License

Private project - All rights reserved.

## 👥 Credits

- **Developer**: BATS Consulting
- **Client**: BPKH (Badan Pengelola Keuangan Haji)
- **Carbon Market**: IDX Carbon
- **Design**: Mobile-first, inspired by modern Islamic fintech apps

---

🕌 **Green Hajj & Umrah** - Ibadah Ramah Lingkungan 🌱

