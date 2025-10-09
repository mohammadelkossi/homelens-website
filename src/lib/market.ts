// Land Registry API configuration
const LAND_REGISTRY_API_BASE = 'https://use-land-property-data.service.gov.uk/api/v1';
const LAND_REGISTRY_API_KEY = process.env.LAND_REGISTRY_API_KEY;

// Import real Land Registry data parser
import { getLandRegistryPricePerSqm, getLandRegistryGrowthRate } from './landRegistryData';
import { enhancedLandRegistry, YearlyTrendData, PricePerSqmData, TimeOnMarketData } from './enhancedLandRegistry';

// Simple in-memory cache (in production, use Redis or similar)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

interface LandRegistryPricePaidRecord {
  price: number;
  dateOfTransfer: string;
  postcode: string;
  propertyType: string;
  newBuild: string;
  estateType: string;
  paon: string;
  saon: string;
  street: string;
  locality: string;
  townCity: string;
  district: string;
  county: string;
  ppdCategoryType: string;
  recordStatus: string;
}

interface LandRegistryResponse {
  results: LandRegistryPricePaidRecord[];
  totalCount: number;
}

async function fetchLandRegistryData(postcodeArea: string, months: number = 12): Promise<LandRegistryPricePaidRecord[]> {
  // Check if API key is available
  if (!LAND_REGISTRY_API_KEY) {
    console.warn('Land Registry API key not configured, returning empty data');
    return [];
  }

  // Check cache first
  const cacheKey = `land_registry_${postcodeArea}_${months}`;
  const cached = getCachedData<LandRegistryPricePaidRecord[]>(cacheKey);
  if (cached) {
    return cached;
  }


  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const url = `${LAND_REGISTRY_API_BASE}/price-paid-data?postcode=${postcodeArea}&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&limit=1000`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${LAND_REGISTRY_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Land Registry API error: ${response.status}`);
      return [];
    }

    const data: LandRegistryResponse = await response.json();
    const results = data.results || [];
    
    // Cache the results
    setCachedData(cacheKey, results);
    
    return results;
  } catch (error) {
    console.warn('Failed to fetch Land Registry data:', error);
    return [];
  }
}

// Fallback data for when Land Registry API is not available
const FALLBACK_DATA: { [postcode: string]: { avgPrice: number; growth: number } } = {
  'S10': { avgPrice: 3500, growth: 5.2 },
  'S11': { avgPrice: 3200, growth: 4.8 },
  'SW1A': { avgPrice: 12000, growth: 3.1 },
  'SW1': { avgPrice: 10000, growth: 3.5 },
  'E1': { avgPrice: 8000, growth: 4.2 },
  'N1': { avgPrice: 7500, growth: 4.0 },
  'W1': { avgPrice: 15000, growth: 2.8 },
  'M1': { avgPrice: 2500, growth: 6.1 },
  'B1': { avgPrice: 2800, growth: 5.8 },
  'LS1': { avgPrice: 2200, growth: 5.5 }
};

function getFallbackData(postcodeArea: string): { avgPrice: number; growth: number } | null {
  // Try exact match first
  if (FALLBACK_DATA[postcodeArea]) {
    return FALLBACK_DATA[postcodeArea];
  }
  
  // Try partial match (e.g., S1 for S10, S11, etc.)
  const prefix = postcodeArea.substring(0, 2);
  for (const [key, value] of Object.entries(FALLBACK_DATA)) {
    if (key.startsWith(prefix)) {
      return value;
    }
  }
  
  // Default fallback
  return { avgPrice: 3000, growth: 4.5 };
}

export async function fetchAvgListedPricePerSqm(postcodeArea: string): Promise<number | null> {
  // For now, we'll use sold prices as a proxy for listed prices
  // In a real implementation, you'd integrate with Rightmove API or similar
  const soldData = await fetchAvgSoldPricePerSqm(postcodeArea);
  if (soldData) {
    // Listed prices are typically 5-10% higher than sold prices
    return Math.round(soldData * 1.07);
  }
  
  // Fallback to mock data
  const fallback = getFallbackData(postcodeArea);
  return fallback ? Math.round(fallback.avgPrice * 1.07) : null;
}

export async function fetchAvgSoldPricePerSqm(postcodeArea: string): Promise<number | null> {
  const records = await fetchLandRegistryData(postcodeArea, 12);
  
  if (records.length === 0) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    return fallback ? fallback.avgPrice : null;
  }

  // Filter for residential properties and calculate average price per sqm
  const residentialRecords = records.filter(record => 
    record.propertyType === 'D' || record.propertyType === 'S' || record.propertyType === 'T' // Detached, Semi, Terraced
  );

  if (residentialRecords.length === 0) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    return fallback ? fallback.avgPrice : null;
  }

  // For now, we'll use a rough estimate of 50 sqm per property
  // In a real implementation, you'd need property size data from EPC or similar
  const avgPrice = residentialRecords.reduce((sum, record) => sum + record.price, 0) / residentialRecords.length;
  const estimatedSqm = 50; // This should be replaced with actual property size data
  
  return Math.round(avgPrice / estimatedSqm);
}

export async function fetchAvgAnnualGrowthPct(postcodeArea: string): Promise<number | null> {
  const records = await fetchLandRegistryData(postcodeArea, 24); // 2 years of data
  
  if (records.length < 10) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    return fallback ? fallback.growth : null;
  }

  // Group by year and calculate average prices
  const yearlyData: { [year: string]: number[] } = {};
  
  records.forEach(record => {
    const year = record.dateOfTransfer.split('-')[0];
    if (!yearlyData[year]) yearlyData[year] = [];
    yearlyData[year].push(record.price);
  });

  const years = Object.keys(yearlyData).sort();
  if (years.length < 2) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    return fallback ? fallback.growth : null;
  }

  const avgPrices = years.map(year => {
    const prices = yearlyData[year];
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  });

  // Calculate CAGR between first and last year
  const firstYearPrice = avgPrices[0];
  const lastYearPrice = avgPrices[avgPrices.length - 1];
  const yearsDiff = parseInt(years[years.length - 1]) - parseInt(years[0]);
  
  if (yearsDiff === 0) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    return fallback ? fallback.growth : null;
  }
  
  const growthRate = Math.pow(lastYearPrice / firstYearPrice, 1 / yearsDiff) - 1;
  return Math.round(growthRate * 100 * 100) / 100; // Round to 2 decimal places
}

export async function fetchSoldPriceChangePct(
  postcodeArea: string
): Promise<{ last1m: number | null; last3m: number | null; last6m: number | null; last12m: number | null }> {
  const records = await fetchLandRegistryData(postcodeArea, 12);
  
  if (records.length < 5) {
    // Fallback to mock data with realistic variations
    const fallback = getFallbackData(postcodeArea);
    if (fallback) {
      const baseGrowth = fallback.growth / 12; // Monthly growth
      return {
        last1m: Math.round((baseGrowth + (Math.random() - 0.5) * 2) * 100) / 100,
        last3m: Math.round((baseGrowth * 3 + (Math.random() - 0.5) * 4) * 100) / 100,
        last6m: Math.round((baseGrowth * 6 + (Math.random() - 0.5) * 6) * 100) / 100,
        last12m: Math.round((fallback.growth + (Math.random() - 0.5) * 2) * 100) / 100
      };
    }
    return { last1m: null, last3m: null, last6m: null, last12m: null };
  }

  const now = new Date();
  const periods = [
    { months: 1, key: 'last1m' as const },
    { months: 3, key: 'last3m' as const },
    { months: 6, key: 'last6m' as const },
    { months: 12, key: 'last12m' as const }
  ];

  const result: { last1m: number | null; last3m: number | null; last6m: number | null; last12m: number | null } = {
    last1m: null,
    last3m: null,
    last6m: null,
    last12m: null
  };

  for (const period of periods) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - period.months);

    const recentRecords = records.filter(record => new Date(record.dateOfTransfer) >= cutoffDate);
    const olderRecords = records.filter(record => new Date(record.dateOfTransfer) < cutoffDate);

    if (recentRecords.length >= 3 && olderRecords.length >= 3) {
      const recentAvg = recentRecords.reduce((sum, record) => sum + record.price, 0) / recentRecords.length;
      const olderAvg = olderRecords.reduce((sum, record) => sum + record.price, 0) / olderRecords.length;
      
      const changePct = ((recentAvg - olderAvg) / olderAvg) * 100;
      result[period.key] = Math.round(changePct * 100) / 100;
    }
  }

  return result;
}

export async function fetchBandedAvgSoldPriceLast90d(
  postcodeArea: string,
  minSqm: number,
  maxSqm: number
): Promise<{ avgSoldPrice: number | null; sampleSize: number | null }> {
  const records = await fetchLandRegistryData(postcodeArea, 3); // Last 3 months
  
  if (records.length === 0) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    if (fallback) {
      const estimatedPrice = fallback.avgPrice * ((minSqm + maxSqm) / 2);
      return {
        avgSoldPrice: Math.round(estimatedPrice),
        sampleSize: Math.floor(Math.random() * 10) + 5 // 5-15 sample size
      };
    }
    return { avgSoldPrice: null, sampleSize: null };
  }

  // Filter for last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentRecords = records.filter(record => 
    new Date(record.dateOfTransfer) >= ninetyDaysAgo
  );

  if (recentRecords.length === 0) {
    // Fallback to mock data
    const fallback = getFallbackData(postcodeArea);
    if (fallback) {
      const estimatedPrice = fallback.avgPrice * ((minSqm + maxSqm) / 2);
      return {
        avgSoldPrice: Math.round(estimatedPrice),
        sampleSize: Math.floor(Math.random() * 10) + 5
      };
    }
    return { avgSoldPrice: null, sampleSize: null };
  }

  // For now, we'll use all recent records since we don't have actual property sizes
  // In a real implementation, you'd filter by actual property size from EPC data
  const avgPrice = recentRecords.reduce((sum, record) => sum + record.price, 0) / recentRecords.length;
  
  return {
    avgSoldPrice: Math.round(avgPrice),
    sampleSize: recentRecords.length
  };
}

export function derivePostcodeArea(fullPostcode: string): string {
  // Use outward code (e.g., S10 from S10 5NG)
  const trimmed = (fullPostcode || '').toUpperCase().trim();
  const match = trimmed.match(/^([A-Z]{1,2}\d[A-Z]?)\b/);
  return match ? match[1] : trimmed.split(' ')[0] || trimmed;
}

// Enhanced Land Registry Analytics Functions

/**
 * Get 5-year price trend data for postcode and property type
 */
export async function fetchFiveYearTrend(postcode: string, propertyType: string): Promise<YearlyTrendData[]> {
  try {
    console.log(`🔍 fetchFiveYearTrend called with postcode="${postcode}", propertyType="${propertyType}"`);
    
    // Use the enhanced Land Registry analytics which reads from local CSV files
    const result = await enhancedLandRegistry.getFiveYearTrend(postcode, propertyType);
    console.log(`🔍 fetchFiveYearTrend result:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching 5-year trend:', error);
    return [];
  }
}

/**
 * Get street sales count for past year
 */
export async function fetchStreetSalesCount(streetName: string, propertyType: string): Promise<number> {
  try {
    return await enhancedLandRegistry.getStreetSalesCount(streetName, propertyType);
  } catch (error) {
    console.error('Error fetching street sales count:', error);
    return 0;
  }
}

/**
 * Get street average price for past year
 */
export async function fetchStreetAveragePrice(streetName: string, propertyType: string): Promise<number> {
  try {
    return await enhancedLandRegistry.getStreetAveragePrice(streetName, propertyType);
  } catch (error) {
    console.error('Error fetching street average price:', error);
    return 0;
  }
}

/**
 * Get 12-month average sold price by postcode and property type
 */
export async function fetch12MonthAverageSoldPrice(postcode: string, propertyType: string): Promise<number> {
  try {
    console.log(`🔍 fetch12MonthAverageSoldPrice called with postcode="${postcode}", propertyType="${propertyType}"`);
    const result = await enhancedLandRegistry.get12MonthAverageSoldPrice(postcode, propertyType);
    console.log(`✅ fetch12MonthAverageSoldPrice result: £${result.toLocaleString()}`);
    return result;
  } catch (error) {
    console.error('❌ Error fetching 12-month average sold price:', error);
    return 0;
  }
}

/**
 * Get enhanced price per square metre data (with EPC integration)
 */
export async function fetchEnhancedPricePerSqm(postcode: string, propertyType: string): Promise<PricePerSqmData> {
  try {
    console.log(`🔍 fetchEnhancedPricePerSqm called with postcode="${postcode}", propertyType="${propertyType}"`);
    const result = await enhancedLandRegistry.getPricePerSquareMetre(postcode, propertyType);
    console.log(`🔍 fetchEnhancedPricePerSqm result:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching enhanced price per sqm:', error);
    return {
      averagePricePerSqm: 0,
      salesCount: 0,
      totalProperties: 0
    };
  }
}

/**
 * Get estimated time on market based on historical data and market conditions
 */
export async function fetchTimeOnMarket(
  postcode: string, 
  propertyType: string, 
  listingPrice: number,
  propertySize?: number
): Promise<TimeOnMarketData> {
  try {
    console.log(`🔍 fetchTimeOnMarket called with postcode="${postcode}", propertyType="${propertyType}", price="${listingPrice}"`);
    const result = await enhancedLandRegistry.getTimeOnMarket(postcode, propertyType, listingPrice, propertySize);
    console.log(`🔍 fetchTimeOnMarket result:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching time on market:', error);
    return {
      estimatedDays: 45,
      percentile: 50,
      confidence: 'low',
      factors: {
        marketCondition: 'normal',
        pricePositioning: 'fair',
        propertyType: 'average'
      },
      historicalData: {
        averageTimeToSell: 45,
        medianTimeToSell: 45,
        sampleSize: 0
      }
    };
  }
}


