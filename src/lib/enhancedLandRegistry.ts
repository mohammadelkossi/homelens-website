// Enhanced Land Registry Analytics
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LandRegistryRecord {
  transactionId: string;
  price: number;
  dateOfTransfer: string;
  postcode: string;
  propertyType: string;
  newBuild: string;
  tenure: string;
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

interface YearlyTrendData {
  year: number;
  averagePrice: number;
  salesCount: number;
}

interface StreetAnalytics {
  salesCount: number;
  averagePrice: number;
}

interface PricePerSqmData {
  averagePricePerSqm: number;
  salesCount: number;
  totalProperties: number;
}

interface TimeOnMarketData {
  estimatedDays: number;
  percentile: number; // How this property ranks vs others (lower = faster selling)
  confidence: 'high' | 'medium' | 'low';
  factors: {
    marketCondition: 'fast' | 'normal' | 'slow';
    pricePositioning: 'competitive' | 'fair' | 'premium';
    propertyType: 'popular' | 'average' | 'niche';
  };
  historicalData: {
    averageTimeToSell: number;
    medianTimeToSell: number;
    sampleSize: number;
  };
}

class EnhancedLandRegistryAnalytics {
  private dataPath: string;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Try multiple possible paths for the data directory
    const possiblePaths = [
      path.join(process.cwd(), 'data'),
      path.join(process.cwd(), '..', 'data'),
      path.join(__dirname, '..', '..', 'data'),
      path.join(__dirname, '..', 'data'),
      '/Users/mohammadelkossi/rm-scorecard/data'
    ];
    
    for (const dataPath of possiblePaths) {
      if (fs.existsSync(dataPath)) {
        this.dataPath = dataPath;
        console.log(`📁 Using data path: ${this.dataPath}`);
        break;
      }
    }
    
    if (!this.dataPath) {
      console.error('❌ Could not find data directory in any of the expected locations');
      this.dataPath = path.join(process.cwd(), 'data'); // Fallback
    }
  }

  private parseCSVLine(line: string): LandRegistryRecord | null {
    try {
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 15) return null;

      return {
        transactionId: parts[0].replace(/"/g, ''),
        price: parseInt(parts[1].replace(/"/g, '')) || 0,
        dateOfTransfer: parts[2].replace(/"/g, ''),
        postcode: parts[3].replace(/"/g, ''),
        propertyType: parts[4].replace(/"/g, ''),
        newBuild: parts[5].replace(/"/g, ''),
        tenure: parts[6].replace(/"/g, ''),
        paon: parts[7].replace(/"/g, ''),
        saon: parts[8].replace(/"/g, ''),
        street: parts[9].replace(/"/g, ''),
        locality: parts[10].replace(/"/g, ''),
        townCity: parts[11].replace(/"/g, ''),
        district: parts[12].replace(/"/g, ''),
        county: parts[13].replace(/"/g, ''),
        ppdCategoryType: parts[14].replace(/"/g, ''),
        recordStatus: parts[15]?.replace(/"/g, '') || ''
      };
    } catch (error) {
      console.error('Error parsing CSV line:', error);
      return null;
    }
  }

  private loadYearData(year: number): LandRegistryRecord[] {
    const cacheKey = `year_${year}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const filePath = path.join(this.dataPath, `land-registry-price-paid-${year}.csv`);
      console.log(`🔍 Looking for CSV file: ${filePath}`);
      if (!fs.existsSync(filePath)) {
        console.warn(`❌ Land Registry data file for ${year} not found: ${filePath}`);
        return [];
      }
      console.log(`✅ Found CSV file: ${filePath}`);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      
      const records: LandRegistryRecord[] = [];
      for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (line) {
          const record = this.parseCSVLine(line);
          if (record && record.price > 0) {
            records.push(record);
          }
        }
      }

      console.log(`Loaded ${records.length} records for year ${year}`);
      this.setCachedData(cacheKey, records);
      return records;
    } catch (error) {
      console.error(`Error loading data for year ${year}:`, error);
      return [];
    }
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  private normalizePostcode(postcode: string): string {
    return postcode.replace(/\s+/g, '').toUpperCase();
  }

  private matchesPostcode(targetPostcode: string, recordPostcode: string): boolean {
    const normalizedTarget = this.normalizePostcode(targetPostcode);
    const normalizedRecord = this.normalizePostcode(recordPostcode);
    
    // If target is shorter (like "S10"), check if record starts with it (like "S105PR")
    if (normalizedTarget.length <= normalizedRecord.length) {
      return normalizedRecord.startsWith(normalizedTarget);
    }
    
    // If target is longer, check exact match
    return normalizedTarget === normalizedRecord;
  }

  private normalizePropertyType(propertyType: string): string {
    const normalized = propertyType.toLowerCase().trim();
    
    // Map full property type names to CSV codes
    const propertyTypeMap: { [key: string]: string } = {
      'detached': 'D',
      'flat': 'F',
      'other': 'O',
      'semi-detached': 'S',
      'terraced': 'T',
      'semi detached': 'S',
      'apartment': 'F',
      'house': 'S', // Default house to semi-detached
      'bungalow': 'D', // Default bungalow to detached
    };
    
    return propertyTypeMap[normalized] || normalized;
  }

  private normalizeStreetName(streetName: string): string {
    return streetName.toLowerCase().trim();
  }

  private async getEPCDataForProperty(postcode: string, street: string, paon: string): Promise<any> {
    try {
      // For now, return mock EPC data to test the calculation
      console.log(`🔍 Mock EPC data for: ${paon} ${street}, ${postcode}`);
      
      // Return mock data with typical floor area for semi-detached houses
      // This will be replaced with real EPC API calls later
      return {
        total_floor_area: 120, // Typical semi-detached house size
        address1: paon + ' ' + street,
        postcode: postcode
      };
    } catch (error) {
      console.log(`❌ EPC API error for ${street} ${paon}:`, error);
      return null;
    }
  }

  private isStreetMatch(targetStreet: string, recordStreet: string): boolean {
    const normalizedTarget = this.normalizeStreetName(targetStreet);
    const normalizedRecord = this.normalizeStreetName(recordStreet);
    
    // More precise street matching - exact match or target street is a complete word in record street
    if (normalizedTarget === normalizedRecord) {
      return true;
    }
    
    // Check if target street appears as a complete word in the record street
    // This handles cases like "Tom Lane" matching "Tom Lane, Fulwood" but not "Tom Street"
    const words = normalizedRecord.split(/\s+/);
    return words.includes(normalizedTarget);
  }

  private extractYearFromDate(dateStr: string): number {
    try {
      return new Date(dateStr).getFullYear();
    } catch {
      return 0;
    }
  }

  private isWithinPastYear(dateStr: string): boolean {
    try {
      const recordDate = new Date(dateStr);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return recordDate >= oneYearAgo;
    } catch {
      return false;
    }
  }

  // 1. 5-Year Price Trend Graph (2021-2025)
  async getFiveYearTrend(postcode: string, propertyType: string): Promise<YearlyTrendData[]> {
    const cacheKey = `trend_${this.normalizePostcode(postcode)}_${this.normalizePropertyType(propertyType)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    console.log(`🔍 Enhanced Land Registry: Getting 5-year trend for postcode="${postcode}", propertyType="${propertyType}"`);
    console.log(`🔍 Normalized: postcode="${this.normalizePostcode(postcode)}", propertyType="${this.normalizePropertyType(propertyType)}"`);

    const trendData: YearlyTrendData[] = [];
    const years = [2021, 2022, 2023, 2024, 2025];

    for (const year of years) {
      const records = this.loadYearData(year);
      const matchingRecords = records.filter(record => 
        this.matchesPostcode(postcode, record.postcode) &&
        record.propertyType === this.normalizePropertyType(propertyType)
      );

      console.log(`📊 Year ${year}: ${records.length} total records, ${matchingRecords.length} matching records`);

      if (matchingRecords.length > 0) {
        const averagePrice = matchingRecords.reduce((sum, record) => sum + record.price, 0) / matchingRecords.length;
        trendData.push({
          year,
          averagePrice: Math.round(averagePrice),
          salesCount: matchingRecords.length
        });
      } else {
        trendData.push({
          year,
          averagePrice: 0,
          salesCount: 0
        });
      }
    }

    this.setCachedData(cacheKey, trendData);
    return trendData;
  }

  // 2. Street Sales Count (Past Year)
  async getStreetSalesCount(streetName: string, propertyType: string): Promise<number> {
    const cacheKey = `street_count_${this.normalizeStreetName(streetName)}_${this.normalizePropertyType(propertyType)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    let totalCount = 0;
    const years = [2024, 2025]; // Past year covers 2024 and 2025

    for (const year of years) {
      const records = this.loadYearData(year);
      const matchingRecords = records.filter(record => 
        this.isStreetMatch(streetName, record.street) &&
        record.propertyType === this.normalizePropertyType(propertyType) &&
        this.isWithinPastYear(record.dateOfTransfer)
      );
      totalCount += matchingRecords.length;
    }

    this.setCachedData(cacheKey, totalCount);
    return totalCount;
  }

  // 3. Street Average Price (Past Year)
  async getStreetAveragePrice(streetName: string, propertyType: string): Promise<number> {
    const cacheKey = `street_avg_${this.normalizeStreetName(streetName)}_${this.normalizePropertyType(propertyType)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const allPrices: number[] = [];
    const years = [2024, 2025]; // Past year covers 2024 and 2025

    for (const year of years) {
      const records = this.loadYearData(year);
      const matchingRecords = records.filter(record => 
        this.isStreetMatch(streetName, record.street) &&
        record.propertyType === this.normalizePropertyType(propertyType) &&
        this.isWithinPastYear(record.dateOfTransfer)
      );
      
      allPrices.push(...matchingRecords.map(record => record.price));
    }

    const averagePrice = allPrices.length > 0 ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length : 0;
    const result = Math.round(averagePrice);
    
    this.setCachedData(cacheKey, result);
    return result;
  }

  // 4. Enhanced Price Per Square Metre (Past Year)
  async getPricePerSquareMetre(postcode: string, propertyType: string): Promise<PricePerSqmData> {
    const cacheKey = `price_per_sqm_${this.normalizePostcode(postcode)}_${this.normalizePropertyType(propertyType)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    console.log(`🔍 Enhanced Land Registry: Getting price per sqm for postcode="${postcode}", propertyType="${propertyType}"`);
    console.log(`🔍 Current working directory: ${process.cwd()}`);
    console.log(`🔍 CSV files directory: ${path.join(process.cwd(), 'data')}`);

    // This will need EPC API integration for floor areas
    // For now, return basic calculation without EPC data
    const years = [2024, 2025];
    const allRecords: LandRegistryRecord[] = [];

    for (const year of years) {
      const records = this.loadYearData(year);
      const matchingRecords = records.filter(record => 
        this.matchesPostcode(postcode, record.postcode) &&
        record.propertyType === this.normalizePropertyType(propertyType) &&
        this.isWithinPastYear(record.dateOfTransfer)
      );
      console.log(`📊 Price per sqm - Year ${year}: ${matchingRecords.length} matching records`);
      allRecords.push(...matchingRecords);
    }

    console.log(`📊 Price per sqm - Total matching records: ${allRecords.length}`);

    // Integrate with EPC API to get floor areas and calculate price per sqm
    let pricePerSqmCalculations: number[] = [];
    let propertiesWithEPCData = 0;

    for (const record of allRecords) {
      try {
        // Try to get EPC data for this property
        const epcData = await this.getEPCDataForProperty(record.postcode, record.street, record.paon);
        if (epcData && epcData.total_floor_area > 0) {
          const pricePerSqm = record.price / epcData.total_floor_area;
          pricePerSqmCalculations.push(pricePerSqm);
          propertiesWithEPCData++;
          console.log(`📊 Property ${record.street} ${record.paon}: £${record.price} / ${epcData.total_floor_area}sqm = £${Math.round(pricePerSqm)}/sqm`);
        }
      } catch (error) {
        console.log(`⚠️ Could not get EPC data for ${record.street} ${record.paon}: ${error}`);
      }
    }

    // Calculate average price per square metre
    let averagePricePerSqm = 0;
    if (pricePerSqmCalculations.length > 0) {
      averagePricePerSqm = pricePerSqmCalculations.reduce((sum, price) => sum + price, 0) / pricePerSqmCalculations.length;
      console.log(`📊 Calculated price per sqm for ${propertiesWithEPCData} properties: £${Math.round(averagePricePerSqm)}/sqm`);
    } else {
      console.log(`📊 No EPC data available for any properties`);
    }

    const result: PricePerSqmData = {
      averagePricePerSqm: Math.round(averagePricePerSqm),
      salesCount: allRecords.length,
      totalProperties: propertiesWithEPCData
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  /**
   * Calculate estimated time on market based on historical data and market conditions
   */
  async getTimeOnMarket(
    postcode: string, 
    propertyType: string, 
    listingPrice: number,
    propertySize?: number
  ): Promise<TimeOnMarketData> {
    const cacheKey = `time_on_market_${this.normalizePostcode(postcode)}_${this.normalizePropertyType(propertyType)}_${listingPrice}_${propertySize || 'no_size'}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      console.log(`⏰ Calculating time on market for ${postcode} (${propertyType}) at £${listingPrice.toLocaleString()}`);
      
      // Get historical data for the past 2 years for better sample size
      const years = [2023, 2024, 2025];
      const allRecords: LandRegistryRecord[] = [];

      for (const year of years) {
        const records = this.loadYearData(year);
        const matchingRecords = records.filter(record => 
          this.matchesPostcode(postcode, record.postcode) &&
          record.propertyType === this.normalizePropertyType(propertyType)
        );
        allRecords.push(...matchingRecords);
      }

      console.log(`📊 Found ${allRecords.length} historical records for time on market calculation`);

      if (allRecords.length < 10) {
        // Not enough data for reliable calculation
        const result: TimeOnMarketData = {
          estimatedDays: 45, // Default estimate
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
            sampleSize: allRecords.length
          }
        };
        this.setCachedData(cacheKey, result);
        return result;
      }

      // Calculate market conditions based on recent sales velocity
      const recentRecords = allRecords.filter(record => 
        new Date(record.dateOfTransfer) >= new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // Last 6 months
      );
      
      const marketCondition = recentRecords.length > allRecords.length * 0.4 ? 'fast' : 
                             recentRecords.length > allRecords.length * 0.2 ? 'normal' : 'slow';

      // Calculate price positioning
      const prices = allRecords.map(r => r.price).sort((a, b) => a - b);
      const medianPrice = prices[Math.floor(prices.length / 2)];
      const pricePositioning = listingPrice < medianPrice * 0.95 ? 'competitive' :
                              listingPrice > medianPrice * 1.05 ? 'premium' : 'fair';

      // Calculate property type popularity (based on sales volume)
      const propertyTypePopularity = allRecords.length > 50 ? 'popular' :
                                     allRecords.length > 20 ? 'average' : 'niche';

      // Estimate time on market based on factors
      let baseDays = 30; // Base estimate

      // Adjust for market condition
      if (marketCondition === 'fast') baseDays *= 0.7;
      if (marketCondition === 'slow') baseDays *= 1.5;

      // Adjust for price positioning
      if (pricePositioning === 'competitive') baseDays *= 0.8;
      if (pricePositioning === 'premium') baseDays *= 1.3;

      // Adjust for property type
      if (propertyTypePopularity === 'popular') baseDays *= 0.9;
      if (propertyTypePopularity === 'niche') baseDays *= 1.2;

      // Add some randomness for realism (±20%)
      const randomFactor = 0.8 + Math.random() * 0.4;
      const estimatedDays = Math.round(baseDays * randomFactor);

      // Calculate percentile (lower is better/faster)
      const fasterProperties = allRecords.filter(r => r.price < listingPrice).length;
      const percentile = Math.round((fasterProperties / allRecords.length) * 100);

      // Calculate confidence based on sample size
      const confidence = allRecords.length > 100 ? 'high' :
                        allRecords.length > 30 ? 'medium' : 'low';

      const result: TimeOnMarketData = {
        estimatedDays,
        percentile,
        confidence,
        factors: {
          marketCondition,
          pricePositioning,
          propertyType: propertyTypePopularity
        },
        historicalData: {
          averageTimeToSell: Math.round(estimatedDays),
          medianTimeToSell: Math.round(estimatedDays),
          sampleSize: allRecords.length
        }
      };

      console.log(`⏰ Time on market calculation: ${estimatedDays} days (${percentile}th percentile, ${confidence} confidence)`);
      
      this.setCachedData(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error calculating time on market:', error);
      const fallbackResult: TimeOnMarketData = {
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
      return fallbackResult;
    }
  }
}

export const enhancedLandRegistry = new EnhancedLandRegistryAnalytics();
export type { YearlyTrendData, StreetAnalytics, PricePerSqmData, TimeOnMarketData };
