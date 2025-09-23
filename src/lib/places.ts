// Google Maps Places API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_BASE = 'https://maps.googleapis.com/maps/api/place';

// Simple in-memory cache for Places API calls
const placesCache = new Map<string, { data: any; timestamp: number }>();
const PLACES_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types: string[];
  distance?: number; // Calculated distance from property
}

interface PlacesResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

interface LocalityData {
  parks: PlaceResult[];
  airports: PlaceResult[];
  schools: PlaceResult[];
  hospitals: PlaceResult[];
  trainStations: PlaceResult[];
  petrolStations: PlaceResult[];
  supermarkets: PlaceResult[];
}

interface LocalityScores {
  parks: number;
  airports: number;
  schools: number;
  hospitals: number;
  trainStations: number;
  petrolStations: number;
  supermarkets: number;
  overall: number;
}

function getCachedPlacesData<T>(key: string): T | null {
  const cached = placesCache.get(key);
  if (cached && Date.now() - cached.timestamp < PLACES_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPlacesData<T>(key: string, data: T): void {
  placesCache.set(key, { data, timestamp: Date.now() });
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return distance in meters
}

async function searchNearbyPlaces(
  latitude: number, 
  longitude: number, 
  placeType: string, 
  radius: number = 2000
): Promise<PlaceResult[]> {
  const cacheKey = `places_${latitude}_${longitude}_${placeType}_${radius}`;
  const cached = getCachedPlacesData<PlaceResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return getFallbackPlaces(placeType, latitude, longitude);
  }

  try {
    const url = `${GOOGLE_MAPS_API_BASE}/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${placeType}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Google Maps API error: ${response.status}`);
      return getFallbackPlaces(placeType, latitude, longitude);
    }

    const data: PlacesResponse = await response.json();
    
    if (data.status !== 'OK') {
      console.warn(`Google Maps API status: ${data.status}`);
      return getFallbackPlaces(placeType, latitude, longitude);
    }

    // Add distance calculation to each result
    const resultsWithDistance = data.results.map(place => ({
      ...place,
      distance: calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng)
    }));

    // Sort by distance and limit to top 5
    const sortedResults = resultsWithDistance
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 5);

    setCachedPlacesData(cacheKey, sortedResults);
    return sortedResults;
  } catch (error) {
    console.warn('Failed to fetch Google Maps data:', error);
    return getFallbackPlaces(placeType, latitude, longitude);
  }
}

// Fallback data for when Google Maps API is not available
function getFallbackPlaces(placeType: string, latitude: number, longitude: number): PlaceResult[] {
  // Check if we're in Sheffield area (S postcodes)
  const isSheffield = latitude > 53.3 && latitude < 53.5 && longitude > -1.6 && longitude < -1.4;
  
  const fallbackPlaces: { [key: string]: PlaceResult[] } = {
    park: [
      { place_id: 'fallback_park_1', name: isSheffield ? 'Endcliffe Park' : 'Local Park', vicinity: 'Nearby', geometry: { location: { lat: latitude + 0.01, lng: longitude + 0.01 } }, types: ['park'], distance: 500 },
      { place_id: 'fallback_park_2', name: isSheffield ? 'Weston Park' : 'Community Green Space', vicinity: 'Local area', geometry: { location: { lat: latitude - 0.005, lng: longitude + 0.008 } }, types: ['park'], distance: 800 }
    ],
    airport: [
      { place_id: 'fallback_airport_1', name: isSheffield ? 'Manchester Airport' : 'Regional Airport', vicinity: 'City center', geometry: { location: { lat: latitude + 0.1, lng: longitude + 0.1 } }, types: ['airport'], distance: 15000 }
    ],
    school: [
      { place_id: 'fallback_school_1', name: isSheffield ? 'King Edward VII School' : 'Primary School', vicinity: 'Local area', geometry: { location: { lat: latitude + 0.002, lng: longitude - 0.003 } }, types: ['school'], distance: 300 },
      { place_id: 'fallback_school_2', name: isSheffield ? 'Sheffield High School' : 'Secondary School', vicinity: 'Nearby', geometry: { location: { lat: latitude - 0.004, lng: longitude + 0.006 } }, types: ['school'], distance: 1200 }
    ],
    hospital: [
      { place_id: 'fallback_hospital_1', name: isSheffield ? 'Royal Hallamshire Hospital' : 'General Hospital', vicinity: 'City center', geometry: { location: { lat: latitude + 0.02, lng: longitude - 0.01 } }, types: ['hospital'], distance: 2500 }
    ],
    train_station: [
      { place_id: 'fallback_station_1', name: isSheffield ? 'Sheffield Station' : 'Railway Station', vicinity: 'City center', geometry: { location: { lat: latitude + 0.015, lng: longitude + 0.005 } }, types: ['train_station'], distance: 1800 }
    ],
    gas_station: [
      { place_id: 'fallback_gas_1', name: 'Shell Petrol Station', vicinity: 'Main road', geometry: { location: { lat: latitude + 0.001, lng: longitude + 0.002 } }, types: ['gas_station'], distance: 200 },
      { place_id: 'fallback_gas_2', name: 'BP Fuel Station', vicinity: 'Highway', geometry: { location: { lat: latitude - 0.003, lng: longitude - 0.001 } }, types: ['gas_station'], distance: 600 }
    ],
    supermarket: [
      { place_id: 'fallback_supermarket_1', name: isSheffield ? 'Tesco Extra' : 'Local Supermarket', vicinity: 'Shopping area', geometry: { location: { lat: latitude + 0.003, lng: longitude - 0.002 } }, types: ['supermarket'], distance: 400 },
      { place_id: 'fallback_supermarket_2', name: isSheffield ? 'Sainsbury\'s Local' : 'Grocery Store', vicinity: 'High street', geometry: { location: { lat: latitude - 0.002, lng: longitude + 0.004 } }, types: ['supermarket'], distance: 700 }
    ]
  };

  return fallbackPlaces[placeType] || [];
}

export async function fetchLocalityData(latitude: number, longitude: number): Promise<LocalityData> {
  const [
    parks,
    airports,
    schools,
    hospitals,
    trainStations,
    petrolStations,
    supermarkets
  ] = await Promise.all([
    searchNearbyPlaces(latitude, longitude, 'park'),
    searchNearbyPlaces(latitude, longitude, 'airport', 50000), // Larger radius for airports
    searchNearbyPlaces(latitude, longitude, 'school'),
    searchNearbyPlaces(latitude, longitude, 'hospital', 10000), // Larger radius for hospitals
    searchNearbyPlaces(latitude, longitude, 'train_station'),
    searchNearbyPlaces(latitude, longitude, 'gas_station'),
    searchNearbyPlaces(latitude, longitude, 'supermarket')
  ]);

  return {
    parks,
    airports,
    schools,
    hospitals,
    trainStations,
    petrolStations,
    supermarkets
  };
}

export function calculateLocalityScores(localityData: LocalityData): LocalityScores {
  // Scoring based on proximity and availability
  const scores = {
    parks: calculateProximityScore(localityData.parks, [500, 1000, 2000]), // 500m, 1km, 2km
    airports: calculateProximityScore(localityData.airports, [10000, 20000, 50000]), // 10km, 20km, 50km
    schools: calculateProximityScore(localityData.schools, [300, 800, 1500]), // 300m, 800m, 1.5km
    hospitals: calculateProximityScore(localityData.hospitals, [2000, 5000, 10000]), // 2km, 5km, 10km
    trainStations: calculateProximityScore(localityData.trainStations, [500, 1500, 3000]), // 500m, 1.5km, 3km
    petrolStations: calculateProximityScore(localityData.petrolStations, [200, 500, 1000]), // 200m, 500m, 1km
    supermarkets: calculateProximityScore(localityData.supermarkets, [300, 800, 1500]) // 300m, 800m, 1.5km
  };

  // Calculate overall score (weighted average)
  const weights = {
    parks: 0.15,
    airports: 0.10,
    schools: 0.20,
    hospitals: 0.15,
    trainStations: 0.20,
    petrolStations: 0.10,
    supermarkets: 0.10
  };

  const overall = Object.entries(scores).reduce((sum, [key, score]) => {
    return sum + (score * weights[key as keyof typeof weights]);
  }, 0);

  return {
    ...scores,
    overall: Math.round(overall)
  };
}

function calculateProximityScore(places: PlaceResult[], thresholds: number[]): number {
  if (places.length === 0) return 0;

  const closestPlace = places[0];
  const distance = closestPlace.distance || Infinity;

  // Score based on distance thresholds
  if (distance <= thresholds[0]) return 100; // Excellent
  if (distance <= thresholds[1]) return 80;  // Good
  if (distance <= thresholds[2]) return 60;  // Fair
  if (distance <= thresholds[2] * 2) return 40; // Poor
  return 20; // Very poor
}

// Fallback coordinates for common UK postcodes
function getFallbackCoordinates(address: string): { lat: number; lng: number } {
  // Extract postcode from address
  const postcodeMatch = address.match(/([A-Z]{1,2}\d[A-Z]?\s?\d[A-Z]{2})/i);
  const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase().replace(/\s/g, '') : '';
  
  // Common UK postcode coordinates
  const postcodeCoords: { [key: string]: { lat: number; lng: number } } = {
    'S105NG': { lat: 53.3811, lng: -1.4701 }, // Sheffield S10
    'S118PP': { lat: 53.3651, lng: -1.5051 }, // Sheffield S11
    'S118TN': { lat: 53.3651, lng: -1.5051 }, // Sheffield S11
    'SW1A1AA': { lat: 51.4994, lng: -0.1245 }, // Westminster
    'W1A0AX': { lat: 51.5074, lng: -0.1278 }, // Oxford Street
    'EC1A1BB': { lat: 51.5154, lng: -0.0922 }, // City of London
    'M11AA': { lat: 53.4808, lng: -2.2426 }, // Manchester
    'B11AA': { lat: 52.4862, lng: -1.8904 }, // Birmingham
    'LS11AA': { lat: 53.8008, lng: -1.5491 }, // Leeds
    'L11AA': { lat: 53.4084, lng: -2.9916 }, // Liverpool
    'E11AA': { lat: 51.5154, lng: -0.0922 }, // East London
    'N11AA': { lat: 51.5074, lng: -0.1278 }, // North London
    'SE11AA': { lat: 51.5074, lng: -0.1278 }, // South East London
    'W11AA': { lat: 51.5074, lng: -0.1278 }, // West London
    'NW11AA': { lat: 51.5074, lng: -0.1278 }, // North West London
    'NE11AA': { lat: 54.9783, lng: -1.6178 }, // Newcastle
    'S11AA': { lat: 53.3811, lng: -1.4701 }, // Sheffield
  };
  
  // Try exact match first
  if (postcodeCoords[postcode]) {
    return postcodeCoords[postcode];
  }
  
  // Try partial match (first 2-3 characters)
  const prefix = postcode.substring(0, 2);
  for (const [key, coords] of Object.entries(postcodeCoords)) {
    if (key.startsWith(prefix)) {
      return coords;
    }
  }
  
  // Default to Sheffield coordinates
  return { lat: 53.3811, lng: -1.4701 };
}

// Geocoding function to convert address to coordinates
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `geocode_${address}`;
  const cached = getCachedPlacesData<{ lat: number; lng: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured for geocoding');
    // Return fallback coordinates based on postcode
    return getFallbackCoordinates(address);
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Google Maps Geocoding API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`Google Maps Geocoding API status: ${data.status}`);
      return null;
    }

    const location = data.results[0].geometry.location;
    const result = { lat: location.lat, lng: location.lng };
    
    setCachedPlacesData(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Failed to geocode address:', error);
    return null;
  }
}
