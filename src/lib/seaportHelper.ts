export interface SeaportOption {
  id: number;
  sourceId: number | null;
  name: string;
  aliasName: string | null;
  lat: number;
  lon: number;
  province: string | null;
  city: string | null;
  address: string | null;
  countryCode: string;
}

export interface SeaportSelectOption {
  value: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
  province: string | null;
  city: string | null;
  address: string | null;
}

export const buildSeaportLabel = (seaport: Pick<SeaportOption, 'name' | 'city' | 'province'>): string => {
  const location = [seaport.city, seaport.province].filter(Boolean).join(', ');
  return location ? `${seaport.name} - ${location}` : seaport.name;
};

export const toSeaportSelectOptions = (seaports: SeaportOption[]): SeaportSelectOption[] => {
  return seaports
    .map((seaport) => ({
      value: `SP-${seaport.id}`,
      label: buildSeaportLabel(seaport),
      name: seaport.name,
      lat: seaport.lat,
      lon: seaport.lon,
      province: seaport.province,
      city: seaport.city,
      address: seaport.address
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const findSeaportByName = (
  options: SeaportSelectOption[],
  name?: string
): SeaportSelectOption | null => {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return (
    options.find((option) => option.name.trim().toLowerCase() === normalized) ||
    options.find((option) => option.label.trim().toLowerCase() === normalized) ||
    null
  );
};

export const calculateSeaportDistanceKm = (
  origin: Pick<SeaportSelectOption, 'lat' | 'lon'>,
  destination: Pick<SeaportSelectOption, 'lat' | 'lon'>
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

export async function fetchSeaports(params?: { q?: string }): Promise<SeaportOption[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);

  const query = search.toString();
  const response = await fetch(`/api/seaports${query ? `?${query}` : ''}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch seaports');
  }

  const data = await response.json();
  return data.seaports || [];
}
