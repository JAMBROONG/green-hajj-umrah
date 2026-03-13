import { AIRPORTS } from '@/lib/constants';

export interface AirportOption {
  id: number;
  name: string;
  iata: string | null;
  icao: string | null;
  country: string;
  lat: number;
  lon: number;
}

export interface AirportSelectOption {
  value: string;
  label: string;
  country: string;
  name: string;
  lat: number;
  lon: number;
}

export const buildAirportLabel = (airport: {
  iata?: string | null;
  name: string;
}) => {
  return airport.iata ? `${airport.iata} - ${airport.name}` : airport.name;
};

export const toIndonesiaSelectOptions = (airports: AirportOption[]): AirportSelectOption[] => {
  return airports
    .map((airport) => ({
      value: `ID-${airport.id}`,
      label: buildAirportLabel(airport),
      country: airport.country,
      name: airport.name,
      lat: airport.lat,
      lon: airport.lon
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getSaudiFallbackOptions = (): AirportSelectOption[] => {
  return Object.entries(AIRPORTS)
    .filter(([, airport]) => airport.country === 'Saudi Arabia')
    .map(([code, airport]) => ({
      value: `SA-${code}`,
      label: `${code} - ${airport.name}`,
      country: airport.country,
      name: airport.name,
      lat: airport.lat,
      lon: airport.lon
    }));
};

export const findAirportByName = (
  options: AirportSelectOption[],
  name?: string
): AirportSelectOption | null => {
  if (!name) return null;
  return options.find((option) => option.name === name) || null;
};

export const calculateFlightDistanceKm = (
  origin: Pick<AirportSelectOption, 'lat' | 'lon'>,
  destination: Pick<AirportSelectOption, 'lat' | 'lon'>
): number => {
  const R = 6371;
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLon = (destination.lon - origin.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export async function fetchAirports(params?: {
  country?: string;
  q?: string;
}): Promise<AirportOption[]> {
  const search = new URLSearchParams();
  if (params?.country) search.set('country', params.country);
  if (params?.q) search.set('q', params.q);

  const query = search.toString();
  const response = await fetch(`/api/airports${query ? `?${query}` : ''}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch airports');
  }

  const data = await response.json();
  return data.airports || [];
}
