// Land Registry API integration utilities

export interface LandRegistryProperty {
  'Transaction unique identifier': string;
  'Price Paid': string;
  'Date of Transfer': string;
  'Postcode': string;
  'Property Type': string;
  'Old/New': string;
  'Duration': string;
  'PAON': string; // Primary Addressable Object Name
  'SAON': string; // Secondary Addressable Object Name
  'Street': string;
  'Locality': string;
  'Town/City': string;
  'District': string;
  'County': string;
  'PPD Category Type': string;
  'Record Status': string;
}

export interface LandRegistryStats {
  totalProperties: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: string;
}

export interface LandRegistryResponse {
  success: boolean;
  data?: {
    properties: LandRegistryProperty[];
    statistics: LandRegistryStats;
    yearlyTrends: Record<string, {
      count: number;
      averagePrice: number;
      medianPrice: number;
    }>;
    postcode: string;
    searchDate: string;
  };
  error?: string;
}

export async function fetchLandRegistryData(postcode: string, propertyType?: string): Promise<LandRegistryResponse> {
  try {
    const response = await fetch('/api/land-registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postcode,
        propertyType,
        limit: 100
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Land Registry data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function calculatePriceGrowth(yearlyTrends: Record<string, any>): number {
  const years = Object.keys(yearlyTrends).sort();
  if (years.length < 2) return 0;

  const latestYear = years[years.length - 1];
  const previousYear = years[years.length - 2];

  const latestPrice = yearlyTrends[latestYear]?.averagePrice || 0;
  const previousPrice = yearlyTrends[previousYear]?.averagePrice || 0;

  if (previousPrice === 0) return 0;

  return ((latestPrice - previousPrice) / previousPrice) * 100;
}

export function findSimilarProperties(
  properties: LandRegistryProperty[], 
  targetProperty: {
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    price?: number;
  }
): LandRegistryProperty[] {
  return properties.filter(property => {
    // Filter by property type if specified
    if (targetProperty.propertyType && 
        property['Property Type'].toLowerCase() !== targetProperty.propertyType.toLowerCase()) {
      return false;
    }

    // Filter by price range (±20% of target price)
    if (targetProperty.price) {
      const propertyPrice = parseInt(property['Price Paid']) || 0;
      const priceRange = targetProperty.price * 0.2;
      if (Math.abs(propertyPrice - targetProperty.price) > priceRange) {
        return false;
      }
    }

    return true;
  });
}

export function extractPostcodeFromAddress(address: string): string | null {
  // UK postcode regex pattern
  const postcodeRegex = /[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}/i;
  const match = address.match(postcodeRegex);
  return match ? match[0].toUpperCase() : null;
}

export function formatLandRegistryProperty(property: LandRegistryProperty) {
  return {
    id: property['Transaction unique identifier'],
    price: parseInt(property['Price Paid']) || 0,
    date: property['Date of Transfer'],
    address: `${property['PAON']} ${property['Street']}`.trim(),
    postcode: property['Postcode'],
    propertyType: property['Property Type'],
    locality: property['Locality'],
    town: property['Town/City'],
    district: property['District'],
    county: property['County']
  };
}




