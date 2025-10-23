import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ApifyClient } from 'apify-client';
import { 
  fetchFiveYearTrend, 
  fetchStreetSalesCount, 
  fetchStreetAveragePrice, 
  fetchEnhancedPricePerSqm,
  fetch12MonthAverageSoldPrice
} from '@/lib/market';
import { fetchLocalityData, geocodeAddress } from '@/lib/places';

// Initialize Apify client
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions for Apify data processing
function normalizePropertyType(type: string): string {
    const normalized = type?.toLowerCase() || '';
    if (normalized.includes('detached')) return 'Detached';
    if (normalized.includes('semi')) return 'Semi-Detached';
    if (normalized.includes('terrace')) return 'Terraced';
    if (normalized.includes('flat') || normalized.includes('apartment')) return 'Flat';
    if (normalized.includes('bungalow')) return 'Bungalow';
    return type || 'Unknown';
}

function extractAreaFromAddress(address: string): string {
    const parts = address?.split(',') || [];
    return parts.length > 2 ? parts[parts.length - 2].trim() : '';
}

function extractPostcode(address: string): string {
    const postcodeRegex = /([A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2})/i;
    const match = address.match(postcodeRegex);
    return match ? match[0] : '';
}

function extractStreetName(address: string): string {
    const parts = address?.split(',') || [];
    return parts[0]?.trim() || '';
}

function calculateDaysOnMarket(dateAdded: string | undefined): number | null {
    if (!dateAdded) return null;
    const addedDate = new Date(dateAdded);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - addedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function parsePrice(priceString: string | number): number {
    if (!priceString) return 0;
    if (typeof priceString === 'number') return priceString;
    return parseInt(priceString.toString().replace(/[^0-9]/g, '')) || 0;
}

// Transform Apify price history to expected format
function transformPriceHistory(apifyPriceHistory: any[]): any[] {
  if (!apifyPriceHistory || !Array.isArray(apifyPriceHistory)) {
    return [];
  }
  
  // Sort by date (oldest first) and transform
  return apifyPriceHistory
    .sort((a, b) => {
      const dateA = a.year || a.date;
      const dateB = b.year || b.date;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    })
    .map((item, index, array) => {
      const price = typeof item.soldPrice === 'number' 
        ? item.soldPrice 
        : parseInt(item.soldPrice?.replace(/[^0-9]/g, '') || item.price?.replace(/[^0-9]/g, '') || '0');
      
      // Calculate percentage change if there's a previous price
      let percentageChange = item.percentageChange || null;
      if (!percentageChange && index > 0) {
        const prevPrice = typeof array[index - 1].soldPrice === 'number' 
          ? array[index - 1].soldPrice 
          : parseInt(array[index - 1].soldPrice?.replace(/[^0-9]/g, '') || array[index - 1].price?.replace(/[^0-9]/g, '') || '0');
        
        if (prevPrice > 0) {
          const change = ((price - prevPrice) / prevPrice) * 100;
          percentageChange = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        }
      }
      
      return {
        date: item.year || item.date, // Use year as date for display
        year: item.year || item.date, // Also include as 'year' for compatibility
        price: price, // Keep as number
        soldPrice: `£${price.toLocaleString('en-GB')}`, // Formatted string
        saleType: 'Sold', // Standard sale type
        event: item.event || 'Sold', // Keep original event if available
        fullDate: item.year || item.date, // Keep full date for reference
        percentageChange: percentageChange
      };
    })
    .reverse(); // Most recent first for display
}

// Helper functions for parallel analysis
async function analyzeBinaryFeaturesParallel(listingText: string, toggles: any, url: string, apifyData?: any) {
  // If we have Apify data, use it directly instead of AI analysis
  if (apifyData) {
    console.log('🔍 Using Apify data for binary features...');
    console.log('🔍 Apify data keys:', Object.keys(apifyData));
    
    // Extract features from Apify data
    const features = {
      parking: extractFeatureFromApify(apifyData, ['parking', 'offRoadParking', 'driveway']),
      garage: extractFeatureFromApify(apifyData, ['garage', 'integralGarage', 'detachedGarage']),
      garden: extractFeatureFromApify(apifyData, ['garden', 'rearGarden', 'frontGarden', 'patio', 'outdoorSpace']),
      newBuild: extractFeatureFromApify(apifyData, ['newBuild', 'newBuildProperty'])
    };
    
    console.log('✅ Binary features from Apify:', features);
    return features;
  }
  
  // Fallback to AI analysis if no Apify data
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-binary-features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingText, features: toggles, images: [], url })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.features) {
        return {
          parking: data.features.parking,
          garage: data.features.garage,
          garden: data.features.garden,
          newBuild: data.features.newBuild
        };
      }
    }
  } catch (error) {
    console.log('⚠️ Binary features API failed, using fallback');
  }
  
  // Fallback to OpenAI
  const binaryPrompt = `Analyze this property listing text for features:
${listingText}

Return JSON: {"parking": true/false/null, "garage": true/false/null, "garden": true/false/null, "newBuild": true/false/null}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Return only valid JSON" }, { role: "user", content: binaryPrompt }],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    
    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('❌ Binary features analysis failed:', error);
    return {
      parking: null,
      garage: null,
      garden: null,
      newBuild: null
    };
  }
}

// Helper function to extract features from Apify data
function extractFeatureFromApify(apifyData: any, featureKeys: string[]): boolean | null {
  // Check if any of the feature keys exist in the Apify data
  for (const key of featureKeys) {
    if (apifyData[key] !== undefined && apifyData[key] !== null) {
      return Boolean(apifyData[key]);
    }
  }
  
  // Check in amenities array if it exists
  if (apifyData.amenities && Array.isArray(apifyData.amenities)) {
    for (const amenity of apifyData.amenities) {
      if (typeof amenity === 'string') {
        const lowerAmenity = amenity.toLowerCase();
        for (const key of featureKeys) {
          if (lowerAmenity.includes(key.toLowerCase())) {
            return true;
          }
        }
      }
    }
  }
  
  // Check in description text
  if (apifyData.description || apifyData.text) {
    const text = (apifyData.description || apifyData.text || '').toLowerCase();
    for (const key of featureKeys) {
      if (text.includes(key.toLowerCase())) {
        return true;
      }
    }
  }
  
  return null; // Feature not found
}

async function analyzeAdditionalCriteriaParallel(listingText: string, anythingElse: string, url: string) {
  if (!anythingElse || !anythingElse.trim()) {
    return [];
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-additional-criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingText, criteria: anythingElse, url })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.criteria) {
        return data.criteria;
      }
    }
  } catch (error) {
    console.log('⚠️ Additional criteria API failed, using fallback');
  }
  
  // Fallback to OpenAI
  const criteriaPrompt = `Analyze this property listing for these specific criteria:
${anythingElse}

Property listing:
${listingText}

Return JSON array: [{"criteria": "criteria name", "met": true/false, "confidence": 0.0-1.0, "reason": "explanation"}]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Return only valid JSON" }, { role: "user", content: criteriaPrompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return result.criteria || result || [];
  } catch (error) {
    console.error('❌ Additional criteria analysis failed:', error);
    return [];
  }
}

async function analyzeCustomPreferencesParallel(listingText: string, userPreferences: any, url: string) {
  if (!userPreferences || (typeof userPreferences === 'string' && !userPreferences.trim()) || (typeof userPreferences === 'object' && Object.keys(userPreferences).length === 0)) {
    return [];
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-custom-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingText, preferences: userPreferences, url })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.preferences) {
        return data.preferences;
      }
    }
  } catch (error) {
    console.log('⚠️ Custom preferences API failed, using fallback');
  }
  
  // Fallback to OpenAI
  const preferencesPrompt = `Analyze this property listing against these user preferences:
${userPreferences}

Property listing:
${listingText}

Return JSON array: [{"preference": "preference name", "met": true/false, "confidence": 0.0-1.0, "reason": "explanation"}]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Return only valid JSON" }, { role: "user", content: preferencesPrompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return result.preferences || result || [];
  } catch (error) {
    console.error('❌ Custom preferences analysis failed:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      listingText,
      url,
      scrapedPropertyData, // Fallback data from HTML scraper
      toggles,
      userPreferences,
      anythingElse,
      rightmove,
      ppdPostcodeSeries,
      ppdPropertyTypeSeries,
      ukFallbackSeries
    } = body;

    if (!listingText) {
      return NextResponse.json({
        success: false,
        error: 'Listing text is required'
      });
    }

    console.log('🔍 Starting comprehensive property analysis with Apify...');
    console.log('📝 Listing text received:', listingText.substring(0, 200) + '...');
    console.log('🔗 URL:', url);

    // ============================================
    // STEP 1: USE APIFY SCRAPER INSTEAD OF HTML SCRAPER
    // ============================================
    
    let basicInfo;
    let apifyRawData = null;
    
    try {
        // Run Apify scraper
        console.log('🔍 Running Apify scraper for:', url);
        
        const input = {
          propertyUrls: [{ url }],
          fullPropertyDetails: true, // Get all property details
          includePriceHistory: true,
          includeNearestSchools: false,
          maxProperties: 1,
          monitoringMode: false,
          addEmptyTrackerRecord: false,
          deduplicateAtTaskLevel: false,
          enableDelistingTracker: false,
          proxy: {
            useApifyProxy: true
          }
        };

        const run = await client.actor("dhrumil/rightmove-scraper").call(input, {
            waitSecs: 120, // Wait up to 2 minutes
        });
        
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
            if (items && items.length > 0) {
                apifyRawData = items[0];
                console.log('✅ Apify data retrieved successfully');
                
                // ADD THESE DEBUG LOGS
                console.log('🔍 APIFY RAW DATA - Full object keys:', Object.keys(apifyRawData));
                console.log('🔍 APIFY RAW DATA - priceHistory:', apifyRawData.priceHistory);
                console.log('🔍 APIFY RAW DATA - Price info:', {
                    price: apifyRawData.price,
                    priceHistory: apifyRawData.priceHistory,
                    dateAdded: apifyRawData.dateAdded,
                    dateReduced: apifyRawData.dateReduced
                });
            
            // Transform Apify data to basicInfo format
            basicInfo = {
                // Core property data
                propertyAddress: apifyRawData.displayAddress || apifyRawData.title || '',
                listingPrice: parsePrice(apifyRawData.price),
                area: extractAreaFromAddress(apifyRawData.displayAddress || ''),
                floorAreaSqm: apifyRawData.sizeSqFeetMin ? Math.round(apifyRawData.sizeSqFeetMin * 0.092903) : (apifyRawData.size || null), // Convert sq ft to sq m
                numberOfBedrooms: apifyRawData.bedrooms || 0,
                numberOfBathrooms: apifyRawData.bathrooms || 0,
                propertyType: normalizePropertyType(apifyRawData.propertyType || ''),
                
                // Coordinates - Use Apify's precise coordinates for Google Maps
                coordinates: apifyRawData.coordinates ? {
                    lat: apifyRawData.coordinates.latitude || null,
                    lng: apifyRawData.coordinates.longitude || null
                } : (apifyRawData.latitude && apifyRawData.longitude ? {
                    lat: apifyRawData.latitude,
                    lng: apifyRawData.longitude
                } : null),
                
                // URL
                listingUrl: url,
                
                // Time on market data (MUCH MORE ACCURATE WITH APIFY!)
                firstVisibleDate: apifyRawData.firstVisibleDate || apifyRawData.addedOn || null,
                firstListedAt: apifyRawData.firstVisibleDate || apifyRawData.addedOn || null,
                timeOnMarketDays: calculateDaysOnMarket(apifyRawData.firstVisibleDate || apifyRawData.addedOn),
                
                // Sale history from Apify (properly transformed)
                propertySaleHistory: transformPriceHistory(apifyRawData.priceHistory),
                
                // Additional valuable data from Apify
                tenure: apifyRawData.tenure,
                councilTaxBand: apifyRawData.councilTaxBand,
                epcRating: apifyRawData.epc?.rating || apifyRawData.epc || null,
                features: apifyRawData.features || [],
                images: apifyRawData.images || [],
                floorPlans: apifyRawData.floorplans || [],
                
                // Schools and transport (great for families!)
                nearestStations: apifyRawData.nearestStations || [],
                
                // Agent details
                agent: apifyRawData.agent,
                
                // Data quality tracking
                dataSource: 'apify',
                scrapedAt: new Date().toISOString()
                };
                
                console.log('📊 Apify data transformed:', basicInfo);
                
                // ADD THIS DEBUG LOG
                console.log('🔍 TRANSFORMED basicInfo.propertySaleHistory:', basicInfo.propertySaleHistory);
            
        } else {
            throw new Error('No data returned from Apify');
        }
        
    } catch (apifyError) {
        console.error('❌ Apify scraper failed, falling back to HTML scraper data:', apifyError);
        
        // FALLBACK: Use existing HTML scraper data if Apify fails
    if (scrapedPropertyData) {
            console.log('✅ Using HTML scraper fallback data');
      basicInfo = {
        propertyAddress: scrapedPropertyData.address || null,
        listingPrice: scrapedPropertyData.price || null,
        area: scrapedPropertyData.address ? scrapedPropertyData.address.split(',')[1]?.trim() || null : null,
        floorAreaSqm: scrapedPropertyData.sizeInSqm || scrapedPropertyData.size || null,
        numberOfBedrooms: scrapedPropertyData.bedrooms || null,
        numberOfBathrooms: scrapedPropertyData.bathrooms || null,
        propertyType: scrapedPropertyData.propertyType || null,
                propertySaleHistory: scrapedPropertyData.priceHistory || null,
                listingUrl: url || null,
                coordinates: scrapedPropertyData.coordinates || null,
                address: scrapedPropertyData.address || null,
                firstVisibleDate: scrapedPropertyData.firstVisibleDate || null,
                listingUpdateDate: scrapedPropertyData.listingUpdateDate || null,
                dataSource: 'html-scraper-fallback',
                scrapedAt: new Date().toISOString()
            };
    } else {
            throw new Error('Both Apify and HTML scraper failed');
        }
    }

    // Validate that property address was extracted
    if (!basicInfo.propertyAddress) {
      console.log('⚠️ Property address not found, using fallback');
      basicInfo.propertyAddress = 'Property Address Not Available';
    }
    
    // Add the full listing text as description for custom preferences analysis
    basicInfo.description = listingText;

    // ============================================
    // REST OF EXISTING ANALYSIS LOGIC (ENHANCED WITH APIFY DATA!)
    // ============================================

    console.log('📊 Fetching enhanced Land Registry analytics with Apify data...');
    console.log('📊 basicInfo.propertyAddress:', basicInfo.propertyAddress);
    console.log('📊 basicInfo.propertyType:', basicInfo.propertyType);
    
    // Extract postcode and street name for Land Registry queries
    const postcode = extractPostcode(basicInfo.propertyAddress);
    const streetName = extractStreetName(basicInfo.propertyAddress);
    
    let enhancedAnalytics = {
      fiveYearTrend: [],
      streetSalesCount: 0,
      streetAveragePrice: 0,
      pricePerSqm: { averagePricePerSqm: 0, salesCount: 0, totalProperties: 0 },
      avgSoldPrice12Months: 0,
      localityData: null,
      timeOnMarket: null
    };

    try {
      // Get coordinates for locality analysis (now from Apify!)
      let coordinates = basicInfo.coordinates;
      console.log('🔍 DEBUG: Coordinates from Apify:', coordinates);
      console.log('🔍 DEBUG: Apify raw data for coordinates:', {
        hasCoordinates: !!apifyRawData.coordinates,
        hasLatLng: !!(apifyRawData.latitude && apifyRawData.longitude),
        coordinates: apifyRawData.coordinates,
        latitude: apifyRawData.latitude,
        longitude: apifyRawData.longitude
      });
      
      if (!coordinates && basicInfo.propertyAddress) {
        console.log('🌍 Geocoding address for locality analysis...');
        coordinates = await geocodeAddress(basicInfo.propertyAddress).catch(error => {
          console.error('❌ Geocoding error:', error);
          return null;
        });
        console.log('🔍 DEBUG: Geocoded coordinates:', coordinates);
      }
      
      console.log('🔍 DEBUG: Final coordinates for locality:', coordinates);
      console.log('🔍 DEBUG: Will Google Maps API be called?', !!coordinates);

          // Re-enable Land Registry calls with timeout protection
          const analyticsPromises = [
            fetchFiveYearTrend(postcode, basicInfo.propertyType).catch(error => {
              console.error('❌ fetchFiveYearTrend error:', error);
              return [];
            }),
            fetchEnhancedPricePerSqm(postcode, basicInfo.propertyType).catch(error => {
              console.error('❌ fetchEnhancedPricePerSqm error:', error);
              return { averagePricePerSqm: 0, salesCount: 0, totalProperties: 0 };
            }),
            fetch12MonthAverageSoldPrice(postcode, basicInfo.propertyType).catch(error => {
              console.error('❌ fetch12MonthAverageSoldPrice error:', error);
              return 0;
            }),
            // Add locality data fetching
            coordinates ? fetchLocalityData(coordinates.lat, coordinates.lng).catch(error => {
              console.error('❌ fetchLocalityData error:', error);
              return null;
            }) : Promise.resolve(null)
          ];

          // Add street analytics if street name is available
          if (streetName) {
            console.log(`🏠 Adding street analytics for: ${streetName}`);
            analyticsPromises.push(
              fetchStreetSalesCount(streetName, basicInfo.propertyType).catch(error => {
                console.error('❌ fetchStreetSalesCount error:', error);
                return 0;
              }),
              fetchStreetAveragePrice(streetName, basicInfo.propertyType).catch(error => {
                console.error('❌ fetchStreetAveragePrice error:', error);
                return 0;
              })
            );
          }

          const results = await Promise.all(analyticsPromises);
          const [fiveYearTrend, pricePerSqm, avgSoldPrice12Months, localityData, ...streetResults] = results;
          
          console.log('🌍 Google Maps data fetched:', localityData);
          console.log('🔍 DEBUG: Locality data summary:', {
            hasParks: !!localityData?.parks?.length,
            hasSchools: !!localityData?.schools?.length,
            hasTrainStations: !!localityData?.trainStations?.length,
            hasSupermarkets: !!localityData?.supermarkets?.length
          });
          console.log(`🔍 API CHECK: avgSoldPrice12Months = ${avgSoldPrice12Months}`);
      
          // Handle street results if they exist
          let streetSalesCount = 0;
          let streetAveragePrice = 0;
      if (streetResults.length >= 2) {
        streetSalesCount = streetResults[0] || 0;
        streetAveragePrice = streetResults[1] || 0;
          }
          
          console.log(`🔍 fetchFiveYearTrend returned:`, fiveYearTrend);
          console.log(`🔍 fetchEnhancedPricePerSqm returned:`, pricePerSqm);
          console.log(`🔍 fetch12MonthAverageSoldPrice returned:`, avgSoldPrice12Months);
      console.log(`🔍 fetchLocalityData returned:`, localityData);

          // Assign all enhanced analytics values
          enhancedAnalytics.fiveYearTrend = fiveYearTrend;
          enhancedAnalytics.pricePerSqm = pricePerSqm;
          enhancedAnalytics.avgSoldPrice12Months = avgSoldPrice12Months;
      enhancedAnalytics.localityData = localityData;
          enhancedAnalytics.streetSalesCount = streetSalesCount;
      enhancedAnalytics.streetAveragePrice = `£${streetAveragePrice?.toLocaleString() || '0'}`;

      // Enhanced time on market calculation with Apify data
      if (basicInfo.firstListedAt) {
            const today = new Date();
        const listingDate = new Date(basicInfo.firstListedAt);
            const timeDiff = today.getTime() - listingDate.getTime();
            const daysOnMarket = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            
            enhancedAnalytics.timeOnMarket = {
              estimatedDays: daysOnMarket,
          listingDate: basicInfo.firstListedAt,
          calculatedAt: today.toISOString(),
          dataSource: basicInfo.dataSource
            };
            
        console.log(`⏰ Time on market: ${daysOnMarket} days (listed on ${basicInfo.firstListedAt})`);
          } else {
            // Fallback if no listing date available
            enhancedAnalytics.timeOnMarket = {
              estimatedDays: 0,
              listingDate: null,
          calculatedAt: new Date().toISOString(),
          dataSource: basicInfo.dataSource
            };
            console.log(`⏰ No listing date available for time on market calculation`);
          }

      } catch (error) {
      console.error('❌ Error in enhanced analytics:', error);
    }

    // Continue with existing parallel analysis...
    console.log('🔍 Starting parallel analysis...');
    
    // Run parallel analysis for binary features, custom criteria, etc.
    const [binaryFeatures, additionalCriteria, customPreferences] = await Promise.all([
      analyzeBinaryFeaturesParallel(listingText, toggles, url, apifyRawData),
      analyzeAdditionalCriteriaParallel(listingText, anythingElse, url),
      analyzeCustomPreferencesParallel(listingText, userPreferences, url)
    ]);


    // Step 8: Generate AI Summary & Recommendations
    console.log('🤖 Generating AI summary and recommendations...');
    let aiSummary = {
      positives: [],
      considerations: [],
      overall: []
    };
    
    try {
      const summaryPrompt = `You are a property analysis expert. Based on the comprehensive analysis below, provide a concise summary with actionable insights.
    
    PROPERTY DETAILS:
    - Address: ${basicInfo.propertyAddress || 'Unknown'}
    - Price: £${basicInfo.listingPrice?.toLocaleString() || 'Unknown'}
    - Type: ${basicInfo.propertyType || 'Unknown'}
    - Size: ${basicInfo.floorAreaSqm ? basicInfo.floorAreaSqm + ' sqm' : 'Unknown'}
    - Bedrooms: ${basicInfo.numberOfBedrooms || 'Unknown'}
    - Bathrooms: ${basicInfo.numberOfBathrooms || 'Unknown'}
    
    MARKET ANALYSIS:
    - 12-Month Average Sold Price: £${enhancedAnalytics.avgSoldPrice12Months?.toLocaleString() || 'N/A'}
    - Average Price per SqM: £${enhancedAnalytics.pricePerSqm?.averagePricePerSqm?.toLocaleString() || 'N/A'}
    - Street Sales Count: ${enhancedAnalytics.streetSalesCount || 0}
    - 5-Year Trend: ${enhancedAnalytics.fiveYearTrend?.length > 0 ? JSON.stringify(enhancedAnalytics.fiveYearTrend) : 'N/A'}
    
    FEATURES:
    ${Object.entries(binaryFeatures).filter(([k, v]) => v === true).map(([k]) => `- ${k}: Yes`).join('\n')}
    
    LOCALITY (Google Maps):
    - Parks nearby: ${enhancedAnalytics.localityData?.parks?.length || 0}
    - Schools nearby: ${enhancedAnalytics.localityData?.schools?.length || 0}
    - Hospitals nearby: ${enhancedAnalytics.localityData?.hospitals?.length || 0}
    - Transit stations nearby: ${enhancedAnalytics.localityData?.trainStations?.length || 0}
    - Supermarkets nearby: ${enhancedAnalytics.localityData?.supermarkets?.length || 0}
    
    Return a JSON object with this structure:
    {
      "positives": ["bullet 1", "bullet 2", "bullet 3"],
      "considerations": ["bullet 1", "bullet 2", "bullet 3"],
      "overall": ["Overall assessment in 1-2 sentences"]
    }
    
    Guidelines:
    - Keep each bullet point concise (max 15 words)
    - Focus on data-driven insights, not generic statements
    - Positives: 3-5 strong points about the property/location
    - Considerations: 3-5 things to think about or potential concerns
    - Overall: 1-2 sentence summary of whether this represents good value
    - Use specific numbers and data points where available
    - Be objective and balanced`;
    
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a property market expert providing concise, data-driven summaries. Return only valid JSON."
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });
    
      aiSummary = JSON.parse(summaryCompletion.choices[0]?.message?.content || '{}');
      console.log('✅ AI Summary generated:', aiSummary);
      
    } catch (error) {
      console.error('❌ AI summary generation failed:', error);
      // Use fallback summary
      aiSummary = {
        positives: ["Property analysis completed"],
        considerations: ["Review all data points carefully"],
        overall: ["Property analysis available for your review."]
      };
    }

    // Step 9: Compile final analysis with exact JSON structure
    const analysisResult = {
      success: true,
      timestamp: new Date().toISOString(),
      propertyUrl: url,
      analysis: {
        basicInfo,
        binaryFeatures,
        additionalCriteria,
        customPreferences,
        enhancedAnalytics,
        localityData: enhancedAnalytics.localityData || null,
        aiSummary,
        failedAnalysis: [],
        userPreferences: userPreferences || null,
        marketGraphs: {},
        diagnostics: {
          confidence: 0.85,
          missing: [],
          notes: []
        }
      }
    };

    console.log('✅ Comprehensive analysis completed with Apify data:', analysisResult);
    console.log('🔍 DEBUG: Final response locality data:', {
      hasLocalityData: !!analysisResult.analysis.localityData,
      localityDataKeys: analysisResult.analysis.localityData ? Object.keys(analysisResult.analysis.localityData) : 'null'
    });
    
    // ADD THIS DEBUG LOG
    console.log('🔍 FINAL API RESPONSE - basicInfo.propertySaleHistory:', analysisResult.analysis.basicInfo.propertySaleHistory);

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('❌ Comprehensive analysis error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform comprehensive analysis',
      errorDetails: error.message,
      timestamp: new Date().toISOString()
    });
  }
}