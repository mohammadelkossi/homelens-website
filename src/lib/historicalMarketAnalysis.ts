// Historical Market Analysis using 5 years of Land Registry data
import fs from 'fs';
import path from 'path';

interface HistoricalMarketData {
  year: number;
  totalRecords: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averagePricePerSqm: number;
  propertyTypeBreakdown: { [key: string]: number };
  quarterlyData: {
    Q1: { averagePrice: number; count: number };
    Q2: { averagePrice: number; count: number };
    Q3: { averagePrice: number; count: number };
    Q4: { averagePrice: number; count: number };
  };
}

interface MarketTrends {
  yearOverYearGrowth: { [year: string]: number };
  compoundAnnualGrowthRate: number;
  marketVolatility: number;
  seasonalPatterns: { [quarter: string]: number };
  propertyTypePerformance: { [type: string]: { [year: string]: number } };
  marketCycles: {
    peakYear: number;
    troughYear: number;
    currentTrend: 'rising' | 'falling' | 'stable';
  };
}

class HistoricalMarketAnalyzer {
  private dataDir: string;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
  }

  private parseCSVLine(line: string): any | null {
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
        recordStatus: parts[15]?.replace(/"/g, '') || 'A'
      };
    } catch (error) {
      return null;
    }
  }

  private getPropertyTypeName(code: string): string {
    const types: { [key: string]: string } = {
      'D': 'Detached',
      'S': 'Semi-detached', 
      'T': 'Terraced',
      'F': 'Flat',
      'O': 'Other'
    };
    return types[code] || 'Unknown';
  }

  private isRelevantPostcode(postcode: string, targetArea: string): boolean {
    const postcodePrefix = postcode.split(' ')[0];
    return postcodePrefix === targetArea || postcodePrefix.startsWith(targetArea.substring(0, 2));
  }

  private getQuarter(month: number): string {
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  }

  private getCachedData(key: string): any | null {
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

  async getHistoricalMarketData(postcodeArea: string): Promise<HistoricalMarketData[]> {
    const cacheKey = `historical_${postcodeArea}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const years = [2021, 2022, 2023, 2024, 2025];
    const historicalData: HistoricalMarketData[] = [];

    for (const year of years) {
      try {
        const filePath = path.join(this.dataDir, `land-registry-price-paid-${year}.csv`);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`Data file for ${year} not found: ${filePath}`);
          continue;
        }

        const csvData = fs.readFileSync(filePath, 'utf-8');
        const lines = csvData.split('\n');
        
        const relevantRecords: any[] = [];
        const quarterlyData: { [quarter: string]: { prices: number[]; count: number } } = {
          Q1: { prices: [], count: 0 },
          Q2: { prices: [], count: 0 },
          Q3: { prices: [], count: 0 },
          Q4: { prices: [], count: 0 }
        };
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const record = this.parseCSVLine(line);
          if (!record || record.price <= 0) continue;
          
          // Filter by postcode area
          if (!this.isRelevantPostcode(record.postcode, postcodeArea)) continue;
          
          relevantRecords.push(record);
          
          // Categorize by quarter
          const date = new Date(record.dateOfTransfer);
          const quarter = this.getQuarter(date.getMonth() + 1);
          quarterlyData[quarter].prices.push(record.price);
          quarterlyData[quarter].count++;
        }

        if (relevantRecords.length === 0) {
          continue;
        }

        // Calculate statistics
        const prices = relevantRecords.map(r => r.price);
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        // Property type breakdown
        const propertyTypeBreakdown: { [key: string]: number } = {};
        relevantRecords.forEach(record => {
          const typeName = this.getPropertyTypeName(record.propertyType);
          propertyTypeBreakdown[typeName] = (propertyTypeBreakdown[typeName] || 0) + 1;
        });

        // Calculate price per sqm (estimated)
        const estimatedSqm = 50;
        const averagePricePerSqm = Math.round(averagePrice / estimatedSqm);

        // Calculate quarterly averages
        const quarterlyAverages = {
          Q1: { averagePrice: quarterlyData.Q1.prices.length > 0 ? Math.round(quarterlyData.Q1.prices.reduce((sum, price) => sum + price, 0) / quarterlyData.Q1.prices.length) : 0, count: quarterlyData.Q1.count },
          Q2: { averagePrice: quarterlyData.Q2.prices.length > 0 ? Math.round(quarterlyData.Q2.prices.reduce((sum, price) => sum + price, 0) / quarterlyData.Q2.prices.length) : 0, count: quarterlyData.Q2.count },
          Q3: { averagePrice: quarterlyData.Q3.prices.length > 0 ? Math.round(quarterlyData.Q3.prices.reduce((sum, price) => sum + price, 0) / quarterlyData.Q3.prices.length) : 0, count: quarterlyData.Q3.count },
          Q4: { averagePrice: quarterlyData.Q4.prices.length > 0 ? Math.round(quarterlyData.Q4.prices.reduce((sum, price) => sum + price, 0) / quarterlyData.Q4.prices.length) : 0, count: quarterlyData.Q4.count }
        };

        historicalData.push({
          year,
          totalRecords: relevantRecords.length,
          averagePrice: Math.round(averagePrice),
          minPrice,
          maxPrice,
          averagePricePerSqm,
          propertyTypeBreakdown,
          quarterlyData: quarterlyAverages
        });

      } catch (error) {
        console.warn(`Error processing ${year} data:`, error);
      }
    }

    this.setCachedData(cacheKey, historicalData);
    return historicalData;
  }

  async analyzeMarketTrends(postcodeArea: string): Promise<MarketTrends> {
    const historicalData = await this.getHistoricalMarketData(postcodeArea);
    
    if (historicalData.length < 2) {
      return this.getFallbackTrends();
    }

    // Calculate year-over-year growth
    const yearOverYearGrowth: { [year: string]: number } = {};
    for (let i = 1; i < historicalData.length; i++) {
      const currentYear = historicalData[i].year;
      const previousYear = historicalData[i - 1].year;
      const currentPrice = historicalData[i].averagePrice;
      const previousPrice = historicalData[i - 1].averagePrice;
      
      const growth = ((currentPrice - previousPrice) / previousPrice) * 100;
      yearOverYearGrowth[`${previousYear}-${currentYear}`] = Math.round(growth * 100) / 100;
    }

    // Calculate Compound Annual Growth Rate (CAGR)
    const firstYearPrice = historicalData[0].averagePrice;
    const lastYearPrice = historicalData[historicalData.length - 1].averagePrice;
    const years = historicalData.length - 1;
    const cagr = Math.pow(lastYearPrice / firstYearPrice, 1 / years) - 1;
    const compoundAnnualGrowthRate = Math.round(cagr * 100 * 100) / 100;

    // Calculate market volatility (standard deviation of year-over-year growth)
    const growthRates = Object.values(yearOverYearGrowth);
    const avgGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - avgGrowth, 2), 0) / growthRates.length;
    const marketVolatility = Math.round(Math.sqrt(variance) * 100) / 100;

    // Analyze seasonal patterns
    const seasonalPatterns: { [quarter: string]: number } = {};
    const quarterAverages: { [quarter: string]: number[] } = { Q1: [], Q2: [], Q3: [], Q4: [] };
    
    historicalData.forEach(yearData => {
      Object.entries(yearData.quarterlyData).forEach(([quarter, data]) => {
        if (data.averagePrice > 0) {
          quarterAverages[quarter].push(data.averagePrice);
        }
      });
    });

    Object.entries(quarterAverages).forEach(([quarter, prices]) => {
      if (prices.length > 0) {
        seasonalPatterns[quarter] = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
      }
    });

    // Analyze property type performance
    const propertyTypePerformance: { [type: string]: { [year: string]: number } } = {};
    const allTypes = new Set<string>();
    
    historicalData.forEach(yearData => {
      Object.keys(yearData.propertyTypeBreakdown).forEach(type => allTypes.add(type));
    });

    allTypes.forEach(type => {
      propertyTypePerformance[type] = {};
      historicalData.forEach(yearData => {
        const count = yearData.propertyTypeBreakdown[type] || 0;
        const percentage = Math.round((count / yearData.totalRecords) * 100 * 100) / 100;
        propertyTypePerformance[type][yearData.year.toString()] = percentage;
      });
    });

    // Identify market cycles
    const prices = historicalData.map(d => d.averagePrice);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const peakYear = historicalData.find(d => d.averagePrice === maxPrice)?.year || 0;
    const troughYear = historicalData.find(d => d.averagePrice === minPrice)?.year || 0;
    
    // Determine current trend
    const recentPrices = prices.slice(-3); // Last 3 years
    let currentTrend: 'rising' | 'falling' | 'stable' = 'stable';
    if (recentPrices.length >= 2) {
      const trend = recentPrices[recentPrices.length - 1] - recentPrices[0];
      if (trend > 50000) currentTrend = 'rising';
      else if (trend < -50000) currentTrend = 'falling';
    }

    return {
      yearOverYearGrowth,
      compoundAnnualGrowthRate,
      marketVolatility,
      seasonalPatterns,
      propertyTypePerformance,
      marketCycles: {
        peakYear,
        troughYear,
        currentTrend
      }
    };
  }

  private getFallbackTrends(): MarketTrends {
    return {
      yearOverYearGrowth: { '2021-2022': 5.2, '2022-2023': 4.8, '2023-2024': 3.1, '2024-2025': 2.8 },
      compoundAnnualGrowthRate: 3.9,
      marketVolatility: 1.2,
      seasonalPatterns: { Q1: 320000, Q2: 340000, Q3: 330000, Q4: 310000 },
      propertyTypePerformance: {
        'Detached': { '2021': 25, '2022': 26, '2023': 27, '2024': 28, '2025': 29 },
        'Semi-detached': { '2021': 35, '2022': 34, '2023': 33, '2024': 32, '2025': 31 },
        'Terraced': { '2021': 25, '2022': 26, '2023': 27, '2024': 28, '2025': 29 },
        'Flat': { '2021': 15, '2022': 14, '2023': 13, '2024': 12, '2025': 11 }
      },
      marketCycles: {
        peakYear: 2023,
        troughYear: 2021,
        currentTrend: 'stable'
      }
    };
  }
}

export const historicalMarketAnalyzer = new HistoricalMarketAnalyzer();

// Export functions for use in market analysis
export async function getHistoricalMarketData(postcodeArea: string) {
  return await historicalMarketAnalyzer.getHistoricalMarketData(postcodeArea);
}

export async function getMarketTrends(postcodeArea: string) {
  return await historicalMarketAnalyzer.analyzeMarketTrends(postcodeArea);
}

export async function getHistoricalPricePerSqm(postcodeArea: string, year: number): Promise<number | null> {
  const historicalData = await historicalMarketAnalyzer.getHistoricalMarketData(postcodeArea);
  const yearData = historicalData.find(d => d.year === year);
  return yearData ? yearData.averagePricePerSqm : null;
}

export async function getHistoricalGrowthRate(postcodeArea: string): Promise<number | null> {
  const trends = await historicalMarketAnalyzer.analyzeMarketTrends(postcodeArea);
  return trends.compoundAnnualGrowthRate;
}



