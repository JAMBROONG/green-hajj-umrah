# Faktor Emisi Makanan (Per Porsi)

Data faktor emisi CO₂e untuk berbagai jenis makanan berdasarkan penelitian internasional.

## Tabel Faktor Emisi

| No | Jenis Makanan | Emisi (kg CO₂e/porsi) | Icon | Keterangan |
|----|---------------|----------------------|------|------------|
| 1  | **Vegan meal** | 0.39 | 🥗 | Makanan berbasis nabati murni tanpa produk hewani sama sekali |
| 2  | **Vegetarian meal** | 0.51 | 🧀 | Makanan vegetarian dengan produk susu/telur |
| 3  | **Meal with fatty fish** | 1.11 | 🐟 | Ikan berlemak seperti salmon, tuna, makarel |
| 4  | **Meal with chicken** | 1.58 | 🍗 | Daging ayam (goreng, bakar, rebus) |
| 5  | **Meal with white fish** | 1.98 | 🐠 | Ikan putih seperti kakap, dori, nila |
| 6  | **Meal with beef** | 7.26 | 🥩 | Daging sapi (rendang, steak, sate) |

## Visualisasi Perbandingan

```
Vegan           ▓░░░░░░░░░░░░░░░░ 0.39 kg CO₂e
Vegetarian      ▓▓░░░░░░░░░░░░░░░ 0.51 kg CO₂e
Fatty Fish      ▓▓▓░░░░░░░░░░░░░░ 1.11 kg CO₂e
Chicken         ▓▓▓▓░░░░░░░░░░░░░ 1.58 kg CO₂e
White Fish      ▓▓▓▓▓░░░░░░░░░░░░ 1.98 kg CO₂e
Beef            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 7.26 kg CO₂e
```

## Insight

- **Daging Sapi** memiliki emisi **18.6x lebih tinggi** dari makanan vegan
- **Ayam** memiliki emisi **4x lebih tinggi** dari makanan vegan
- **Ikan berlemak** memiliki emisi **2.8x lebih tinggi** dari makanan vegan
- **Vegetarian** memiliki emisi **30% lebih tinggi** dari vegan (karena produk susu)

## Rekomendasi

Untuk mengurangi jejak karbon selama perjalanan ibadah:

1. 🥗 **Pilih menu vegetarian/vegan** sebanyak mungkin
2. 🐟 **Pilih ikan** sebagai protein hewani alternatif
3. 🍗 **Batasi konsumsi ayam** jika ingin protein hewani
4. 🥩 **Hindari daging sapi** atau konsumsi sesekali saja

## Implementasi di Kode

Faktor emisi ini sudah diimplementasikan di:

**File:** `src/lib/constants.ts`

```typescript
export const FOOD_FACTORS = {
  'vegan': 0.39,           // Vegan meal
  'vegetarian': 0.51,      // Vegetarian meal
  'ikan-berlemak': 1.11,   // Meal with fatty fish
  'ayam': 1.58,            // Meal with chicken
  'ikan-putih': 1.98,      // Meal with white fish
  'daging-sapi': 7.26,     // Meal with beef
} as const;

export const FOOD_ITEMS = [
  { id: 'vegan', name: 'Vegan Meal', icon: '🥗', emission: 0.39 },
  { id: 'vegetarian', name: 'Vegetarian Meal', icon: '🧀', emission: 0.51 },
  { id: 'ikan-berlemak', name: 'Ikan Berlemak', icon: '🐟', emission: 1.11 },
  { id: 'ayam', name: 'Ayam', icon: '🍗', emission: 1.58 },
  { id: 'ikan-putih', name: 'Ikan Putih', icon: '🐠', emission: 1.98 },
  { id: 'daging-sapi', name: 'Daging Sapi', icon: '🥩', emission: 7.26 },
];
```

## Sumber Data

Data faktor emisi ini berdasarkan:
- Life Cycle Assessment (LCA) produk makanan
- Carbon footprint database internasional
- Penelitian peer-reviewed tentang emisi makanan per porsi

## Catatan

- Nilai emisi ini adalah **per porsi** (1 kali makan)
- Sudah termasuk proses produksi, transportasi, dan pengolahan
- Angka dapat bervariasi tergantung metode memasak dan sumber bahan
