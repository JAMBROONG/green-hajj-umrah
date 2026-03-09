/**
 * Location search and distance calculation utilities using OpenStreetMap Nominatim API
 */

export interface Location {
  displayName: string;
  lat: number;
  lon: number;
  placeId: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

/**
 * Search for locations using Nominatim API
 */
export async function searchLocations(query: string): Promise<Location[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        format: 'json',
        limit: '5',
        addressdetails: '1',
      }),
      {
        headers: {
          'User-Agent': 'GreenHajjUmrah/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch locations');
    }

    const data: NominatimResult[] = await response.json();
    
    return data.map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      placeId: parseInt(item.place_id),
    }));
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
}

/**
 * Calculate routing distance between two coordinates using OSRM API
 * Returns distance in kilometers following actual roads
 */
export async function calculateRoutingDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
      {
        headers: {
          'User-Agent': 'GreenHajjUmrah/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to calculate route');
    }

    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    // Distance is in meters, convert to kilometers
    const distanceInKm = data.routes[0].distance / 1000;
    return Math.round(distanceInKm * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating routing distance:', error);
    // Fallback to Haversine formula if routing fails
    return calculateStraightDistance(lat1, lon1, lat2, lon2);
  }
}

/**
 * Calculate straight-line distance between two coordinates using Haversine formula
 * Returns distance in kilometers (fallback method)
 */
function calculateStraightDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
