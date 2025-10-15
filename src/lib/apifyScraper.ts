// Apify Rightmove Scraper Integration
import { ApifyClient } from 'apify-client';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'dhrumil/rightmove-scraper';

export interface ApifyPropertyData {
  address?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  size?: number;
  sizeInSqm?: number;
  description?: string;
  features?: string[];
  images?: string[];
  coordinates?: { lat: number; lng: number };
  priceHistory?: any[];
  epc?: any;
  floorplans?: string[];
  firstVisibleDate?: string;
  listingUpdateDate?: string;
  tenure?: string;
  councilTaxBand?: string;
  agent?: {
    name?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
}

export interface ApifyScrapeResult {
  success: boolean;
  data: ApifyPropertyData | null;
  error?: string;
  method: 'apify';
}

/**
 * Extract property ID from Rightmove URL
 * e.g. https://www.rightmove.co.uk/properties/123456789 -> 123456789
 */
function extractPropertyId(url: string): string | null {
  const match = url.match(/properties\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Scrape a single Rightmove property using Apify
 */
export async function scrapeWithApify(url: string): Promise<ApifyScrapeResult> {
  if (!APIFY_TOKEN) {
    console.error('❌ APIFY_API_TOKEN not configured');
    return {
      success: false,
      data: null,
      error: 'Apify API token not configured',
      method: 'apify'
    };
  }

  try {
    console.log('🚀 Starting Apify scrape for:', url);
    
    const client = new ApifyClient({
      token: APIFY_TOKEN,
    });

    // Prepare input for Apify actor
    const input = {
      propertyUrls: [{ url }],
      fullPropertyDetails: true,
      includePriceHistory: true,
      includeNearestSchools: false, // We use Google Maps for this
      maxProperties: 1,
      monitoringMode: false
    };

    console.log('📝 Apify input:', JSON.stringify(input, null, 2));

    // Run the actor and wait for results
    console.log('⏳ Running Apify actor...');
    const run = await client.actor(ACTOR_ID).call(input, {
      waitSecs: 120, // Wait up to 2 minutes
    });

    console.log('✅ Apify actor finished, run ID:', run.id);

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      console.warn('⚠️ No data returned from Apify');
      return {
        success: false,
        data: null,
        error: 'No data returned from Apify',
        method: 'apify'
      };
    }

    const property = items[0];
    console.log('📊 Apify raw data:', JSON.stringify(property, null, 2));

    // Map Apify data to our format
    const mappedData: ApifyPropertyData = {
      address: property.displayAddress || property.title || null,
      price: property.price || null,
      bedrooms: property.bedrooms || null,
      bathrooms: property.bathrooms || null,
      propertyType: property.propertyType || null,
      size: property.size || null,
      sizeInSqm: property.size || null, // Apify returns size in sqm
      description: property.text || property.formattedDescription || null,
      features: property.amenities || [],
      images: property.images || [],
      coordinates: property.latitude && property.longitude 
        ? { lat: property.latitude, lng: property.longitude }
        : null,
      priceHistory: property.priceHistory || [],
      epc: property.epc || null,
      floorplans: property.floorplans || [],
      firstVisibleDate: property.firstVisibleDate || null,
      listingUpdateDate: property.listingUpdateDate || null,
      tenure: property.tenure || null,
      councilTaxBand: property.councilTaxBand || null,
      agent: {
        name: property.branchName || null,
        phone: property.telephone || null,
        address: property.branchAddress || null,
        logo: property.branchLogo || null
      }
    };

    console.log('✅ Apify scrape successful:', mappedData.address);
    
    return {
      success: true,
      data: mappedData,
      method: 'apify'
    };

  } catch (error) {
    console.error('❌ Apify scrape error:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'apify'
    };
  }
}

/**
 * Get property details with Apify (premium tier)
 * Includes all available data points: price history, EPC, floor plans, etc.
 */
export async function getFullPropertyDetails(url: string): Promise<ApifyScrapeResult> {
  return scrapeWithApify(url);
}

