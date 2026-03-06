export type PhaseId = 
  | 'pra-keberangkatan'
  | 'penerbangan-pergi'
  | 'madinah'
  | 'makkah'
  | 'arafah'
  | 'muzdalifah'
  | 'mina'
  | 'rekreasi'
  | 'pulang';

export type CategoryId = 'transport' | 'hotel' | 'food' | 'waste';

export type VehicleType = 'bus' | 'mobil' | 'kereta';
export type HotelStars = 3 | 4 | 5;
export type FoodType = 'nasi-ayam' | 'daging-sapi' | 'ikan' | 'vegetarian';

// Activity types for multiple input system
export interface TransportActivity {
  id: string;
  type: string; // bus, mobil, kereta, pesawat-ekonomi, pesawat-bisnis
  distance: number;
  passengers?: number;
  date?: string;
  emission: number;
  origin?: {
    name: string;
    lat: number;
    lon: number;
  };
  destination?: {
    name: string;
    lat: number;
    lon: number;
  };
}

export interface HotelActivity {
  id: string;
  hotelId: string;
  hotelName: string;
  stars: HotelStars;
  nights: number;
  checkIn?: string;
  checkOut?: string;
  emission: number;
}

export interface FoodActivity {
  id: string;
  foodId: string;
  foodName: string;
  servings: number;
  date?: string;
  emission: number;
}

export interface WasteActivity {
  id: string;
  type: string; // plastic, organic, other
  amount: number;
  date?: string;
  emission: number;
}

// New CategoryData structure with activities
export interface CategoryData {
  completed: boolean;
  totalEmission: number;
  activities: TransportActivity[] | HotelActivity[] | FoodActivity[] | WasteActivity[];
  
  // Legacy support - will be migrated
  emission?: number;
  details?: {
    vehicleType?: VehicleType;
    distance?: number;
    hotelStars?: HotelStars;
    days?: number;
    foodType?: FoodType;
    meals?: number;
    weight?: number;
    autoCalculated?: boolean;
  };
}

export interface PhaseData {
  completed: boolean;
  categories: {
    [key in CategoryId]?: CategoryData;
  };
}

export interface HajiJourney {
  currentPhase: number;
  phases: {
    [key in PhaseId]?: PhaseData;
  };
}

export type CarbonProductId = 'IDTBS' | 'IDTBS-RE' | 'IDTBSA' | 'IDTBSA-RE';

export interface CarbonProduct {
  name: string;
  price: number;
  project: string;
  image: string;
  colorClass: string;
}

export type PaymentMethod = 'gopay' | 'ovo' | 'dana' | 'bca' | 'mandiri' | 'bni';
