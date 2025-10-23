// src/lib/supabaseLandRegistry.ts
import { createClient } from '@supabase/supabase-js';

// Create Supabase client only if environment variables are available
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('⚠️ Supabase not configured - skipping Supabase operations');
    return null;
  }
  
  return createClient(url, key);
}

interface YearlyTrendData {
  year: number;
  averagePrice: number;
  salesCount: number;
}

export class SupabaseLandRegistry {
  
  // Get 12-month average sold price
  async get12MonthAverageSoldPrice(postcode: string, propertyType: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase not available - returning 0 for average price');
      return 0;
    }
    
    const normalizedPostcode = postcode.toUpperCase().replace(/\s/g, '');
    const normalizedType = this.normalizePropertyType(propertyType);
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { data, error } = await supabase
      .from('land_registry')
      .select('price')
      .ilike('postcode', `${normalizedPostcode}%`)
      .eq('property_type', normalizedType)
      .gte('date_of_transfer', oneYearAgo.toISOString())
      .lte('date_of_transfer', new Date().toISOString());
    
    if (error || !data || data.length === 0) {
      console.error('Error fetching 12-month average:', error);
      return 0;
    }
    
    const total = data.reduce((sum, record) => sum + record.price, 0);
    return Math.round(total / data.length);
  }

  // Get 5-year trend
  async getFiveYearTrend(postcode: string, propertyType: string): Promise<YearlyTrendData[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase not available - returning empty trend data');
      return [];
    }
    
    const normalizedPostcode = postcode.toUpperCase().replace(/\s/g, '');
    const normalizedType = this.normalizePropertyType(propertyType);
    const trendData: YearlyTrendData[] = [];
    
    for (let year = 2021; year <= 2025; year++) {
      const { data, error } = await supabase
        .from('land_registry')
        .select('price')
        .ilike('postcode', `${normalizedPostcode}%`)
        .eq('property_type', normalizedType)
        .gte('date_of_transfer', `${year}-01-01`)
        .lte('date_of_transfer', `${year}-12-31`);
      
      if (!error && data && data.length > 0) {
        const averagePrice = data.reduce((sum, r) => sum + r.price, 0) / data.length;
        trendData.push({
          year,
          averagePrice: Math.round(averagePrice),
          salesCount: data.length
        });
      } else {
        trendData.push({ year, averagePrice: 0, salesCount: 0 });
      }
    }
    
    return trendData;
  }

  // Get street sales count
  async getStreetSalesCount(streetName: string, propertyType: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase not available - returning 0 for street sales count');
      return 0;
    }
    
    const normalizedType = this.normalizePropertyType(propertyType);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { count, error } = await supabase
      .from('land_registry')
      .select('*', { count: 'exact', head: true })
      .ilike('street', `%${streetName}%`)
      .eq('property_type', normalizedType)
      .gte('date_of_transfer', oneYearAgo.toISOString());
    
    return error || !count ? 0 : count;
  }

  // Get street average price
  async getStreetAveragePrice(streetName: string, propertyType: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase not available - returning 0 for street average price');
      return 0;
    }
    
    const normalizedType = this.normalizePropertyType(propertyType);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { data, error } = await supabase
      .from('land_registry')
      .select('price')
      .ilike('street', `%${streetName}%`)
      .eq('property_type', normalizedType)
      .gte('date_of_transfer', oneYearAgo.toISOString());
    
    if (error || !data || data.length === 0) return 0;
    
    const total = data.reduce((sum, record) => sum + record.price, 0);
    return Math.round(total / data.length);
  }

  // Helper function to normalize property type
  private normalizePropertyType(propertyType: string): string {
    const normalized = propertyType.toLowerCase().trim();
    const typeMap: { [key: string]: string } = {
      'detached': 'D',
      'flat': 'F',
      'other': 'O',
      'semi-detached': 'S',
      'semi detached': 'S',
      'terraced': 'T',
      'apartment': 'F',
      'house': 'S',
      'bungalow': 'D',
    };
    return typeMap[normalized] || propertyType.toUpperCase();
  }
}

export const supabaseLandRegistry = new SupabaseLandRegistry();