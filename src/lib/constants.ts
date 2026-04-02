// Phase Definitions
export const PHASE_DEFINITIONS = [
  {
    id: 'pra-keberangkatan',
    name: 'Pra-keberangkatan',
    icon: '🏠',
    description: 'Persiapan sebelum keberangkatan',
    categories: ['transport', 'hotel', 'food', 'waste'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'mixed' as const  // All transport types allowed
  },
  {
    id: 'keberangkatan',
    name: 'Keberangkatan',
    icon: '✈️',
    description: 'Keberangkatan dari Indonesia ke Arab Saudi',
    categories: ['transport'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'airplane' as const  // Airplane only
  },
  {
    id: 'madinah',
    name: 'Madinah',
    icon: '🕌',
    description: 'Tinggal dan beribadah di Madinah',
    categories: ['transport', 'hotel', 'food', 'waste'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'perjalanan-antar-kota',
    name: 'Perjalanan Antar Kota',
    icon: '🛣️',
    description: 'Perjalanan antara Madinah - Makkah dan sebaliknya',
    categories: ['transport'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'makkah',
    name: 'Makkah',
    icon: '🕋',
    description: 'Di Makkah',
    categories: ['transport', 'hotel', 'food', 'waste'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'arafah',
    name: 'Arafah',
    icon: '⛰️',
    description: 'Wukuf di Arafah',
    categories: ['transport', 'hotel', 'food', 'waste'],
    type: ['haji'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'muzdalifah',
    name: 'Muzdalifah',
    icon: '🌙',
    description: 'Bermalam di Muzdalifah',
    categories: ['transport', 'food', 'waste'],
    type: ['haji'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'mina',
    name: 'Mina (Tasyrik)',
    icon: '🎯',
    description: 'Hari Tasyrik di Mina',
    categories: ['transport', 'hotel', 'food', 'waste'],
    type: ['haji'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'rekreasi',
    name: 'Fase Perjalanan Tambahan',
    icon: '🎡',
    description: 'Aktivitas perjalanan tambahan atau insidental di luar rangkaian utama',
    categories: ['transport', 'hotel', 'food', 'waste'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'ground' as const  // Ground transport only
  },
  {
    id: 'kepulangan',
    name: 'Kepulangan',
    icon: '🏠',
    description: 'Kepulangan dari Arab Saudi ke Indonesia',
    categories: ['transport'],
    type: ['haji', 'umrah'] as const,
    transportTypes: 'airplane' as const  // Airplane only
  }
] as const;

// Category Definitions
export const CATEGORY_DEFINITIONS = {
  transport: {
    name: 'Transportasi',
    icon: '🚌',
    color: 'blue',
    description: 'Kendaraan darat, laut, dan udara'
  },
  hotel: {
    name: 'Hotel/Penginapan',
    icon: '🏨',
    color: 'purple',
    description: 'Hotel dan penginapan selama perjalanan'
  },
  food: {
    name: 'Konsumsi',
    icon: '🍽️',
    color: 'orange',
    description: 'Makan dan minum'
  },
  waste: {
    name: 'Limbah',
    icon: '♻️',
    color: 'green',
    description: 'Sampah dan limbah lainnya'
  }
} as const;

// Carbon Products
export const CARBON_PRODUCTS = {
  'IDTBS': { 
    name: 'Technology Based Solution', 
    price: 1, 
    project: 'Restorasi Gambut',
    image: '/IDTBS.jpg',
    colorClass: 'text-primary bg-primaryLight'
  },
  'IDTBS-RE': { 
    name: 'TBS Renewable Energy', 
    price: 1, 
    project: 'PLTS & PLTB',
    image: '/IDTBS-RE.jpg',
    colorClass: 'text-blue-600 bg-blue-50'
  },
  'IDTBSA': { 
    name: 'TBS Authorized', 
    price: 1, 
    project: 'Konservasi Hutan',
    image: '/IDTBSA.jpg',
    colorClass: 'text-green-600 bg-green-50'
  },
  'IDTBSA-RE': { 
    name: 'TBSA Renewable Energy', 
    price: 1, 
    project: 'Energi Hijau Premium',
    image: '/IDTBSA-RE.jpg',
    colorClass: 'text-purple-600 bg-purple-50'
  }
} as const;

// Dummy Data for Select2 Dropdowns
export const HOTELS_DATA = [
  // Madinah Hotels
  { id: 'hilton-madinah', name: 'Hilton Madinah', city: 'Madinah', stars: 5 },
  { id: 'movenpick-madinah', name: 'Mövenpick Hotel Madinah', city: 'Madinah', stars: 5 },
  { id: 'oberoi-madinah', name: 'The Oberoi Madinah', city: 'Madinah', stars: 5 },
  { id: 'intercontinental-madinah', name: 'InterContinental Dar Al Iman', city: 'Madinah', stars: 5 },
  { id: 'pullman-zamzam-madinah', name: 'Pullman ZamZam Madinah', city: 'Madinah', stars: 5 },
  { id: 'anwar-al-madinah', name: 'Anwar Al Madinah Mövenpick', city: 'Madinah', stars: 4 },
  { id: 'dar-al-taqwa', name: 'Dar Al Taqwa Hotel', city: 'Madinah', stars: 4 },
  { id: 'al-haram-hotel', name: 'Al Haram Hotel', city: 'Madinah', stars: 4 },
  { id: 'elaf-al-mashaer', name: 'Elaf Al Mashaer Hotel', city: 'Madinah', stars: 3 },
  { id: 'al-aqeeq-hotel', name: 'Al Aqeeq Hotel', city: 'Madinah', stars: 3 },
  
  // Makkah Hotels
  { id: 'fairmont-makkah', name: 'Fairmont Makkah Clock Royal Tower', city: 'Makkah', stars: 5 },
  { id: 'swissotel-makkah', name: 'Swissôtel Makkah', city: 'Makkah', stars: 5 },
  { id: 'raffles-makkah', name: 'Raffles Makkah Palace', city: 'Makkah', stars: 5 },
  { id: 'conrad-makkah', name: 'Conrad Makkah', city: 'Makkah', stars: 5 },
  { id: 'anjum-makkah', name: 'Anjum Hotel Makkah', city: 'Makkah', stars: 5 },
  { id: 'dar-al-tawhid-makkah', name: 'Dar Al Tawhid Intercontinental', city: 'Makkah', stars: 4 },
  { id: 'elaf-kinda', name: 'Elaf Kinda Hotel', city: 'Makkah', stars: 4 },
  { id: 'al-safwah-royale', name: 'Al Safwah Royale Orchid', city: 'Makkah', stars: 4 },
  { id: 'al-marwa-rayhaan', name: 'Al Marwa Rayhaan by Rotana', city: 'Makkah', stars: 3 },
  { id: 'makarem-ajyad', name: 'Makarem Ajyad Makkah', city: 'Makkah', stars: 3 },
  
  // General/Asrama
  { id: 'asrama-haji-jakarta', name: 'Asrama Haji Jakarta', city: 'Jakarta', stars: 3 },
  { id: 'asrama-haji-surabaya', name: 'Asrama Haji Surabaya', city: 'Surabaya', stars: 3 },
  { id: 'pondok-gede', name: 'Pondok Gede Haji', city: 'Jakarta', stars: 3 },
] as const;

export const FOODS_DATA = [
  { id: 'nasi-ayam', name: 'Nasi dengan Ayam', factor: 1.2 },
  { id: 'nasi-kambing', name: 'Nasi dengan Kambing', factor: 3.5 },
  { id: 'nasi-ikan', name: 'Nasi dengan Ikan', factor: 1.5 },
  { id: 'kebab', name: 'Kebab/Shawarma', factor: 2.8 },
  { id: 'mandi-rice', name: 'Mandi Rice', factor: 3.0 },
  { id: 'kabsa', name: 'Kabsa (Saudi Traditional)', factor: 3.2 },
  { id: 'biryani', name: 'Biryani', factor: 2.5 },
  { id: 'salad', name: 'Salad/Sayuran', factor: 0.5 },
  { id: 'roti-hummus', name: 'Roti dengan Hummus', factor: 0.8 },
  { id: 'sup-lentil', name: 'Sup Lentil', factor: 0.6 },
  { id: 'falafel', name: 'Falafel', factor: 0.7 },
  { id: 'dates-fruits', name: 'Kurma & Buah-buahan', factor: 0.3 },
] as const;

// Constants
export const STORAGE_KEY = 'greenHajPhases';
export const TARGET_EMISSION = 4000;
export const AVG_EMISSION = 3500;

// Emission Factors
// export const TRANSPORT_FACTORS = {
//   bus: 0.10385,
//   'bus-listrik': 0.03,
//   mobil: 0.16725,
//   'mobil-listrik': 0.05,
//   kapal: 0.1127,
//   kereta: 0.03546,
//   'pesawat-ekonomi': 0.10916,
//   'pesawat-bisnis': 0.43663
// } as const;

export const HOTEL_FACTORS = {
  3: 15,
  4: 22,
  5: 35
} as const;

export const FOOD_FACTORS = {
  'vegan': 0.39,           // Vegan meal
  'vegetarian': 0.51,      // Vegetarian meal
  'ikan-berlemak': 1.11,   // Meal with fatty fish
  'ayam': 1.58,            // Meal with chicken
  'ikan-putih': 1.98,      // Meal with white fish
  'daging-sapi': 7.26,     // Meal with beef
  
  // Legacy/Backward compatibility
  'nasi-ayam': 1.58,       // Same as ayam
  'ikan': 1.11             // Default to fatty fish
} as const;

// Food Items Reference (for UI dropdowns)
export const FOOD_ITEMS = [
  { id: 'vegan', name: 'Vegan Meal', icon: '🥗', emission: 0.39, description: 'Makanan berbasis nabati tanpa produk hewani' },
  { id: 'vegetarian', name: 'Vegetarian Meal', icon: '🧀', emission: 0.51, description: 'Makanan vegetarian dengan produk susu/telur' },
  { id: 'ikan-berlemak', name: 'Ikan Berlemak', icon: '🐟', emission: 1.11, description: 'Salmon, tuna, makarel' },
  { id: 'ayam', name: 'Ayam', icon: '🍗', emission: 1.58, description: 'Daging ayam (goreng, bakar, rebus)' },
  { id: 'ikan-putih', name: 'Ikan Putih', icon: '🐠', emission: 1.98, description: 'Kakap, dori, nila' },
  { id: 'daging-sapi', name: 'Daging Sapi', icon: '🥩', emission: 7.26, description: 'Daging sapi (rendang, steak, sate)' },
] as const;

export const WASTE_FACTOR = 0.5;

// Flight emissions (kg CO2e per passenger)
export const FLIGHT_EMISSION_PERGI = 1500; // ID → KSA
export const FLIGHT_EMISSION_PULANG = 1500; // KSA → ID
