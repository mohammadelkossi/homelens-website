import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  fetchFiveYearTrend, 
  fetchStreetSalesCount, 
  fetchStreetAveragePrice, 
  fetchEnhancedPricePerSqm
} from '@/lib/market';
import { smartScrapeProperty } from '@/lib/smartScraper';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions for parallel analysis
async function analyzeBinaryFeaturesParallel(listingText: string, toggles: any, url: string) {
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
          parking: toggles.parking ? data.features.parking : null,
          garage: toggles.garage ? data.features.garage : null,
          garden: toggles.garden ? data.features.garden : null,
          newBuild: toggles.newBuild ? data.features.newBuild : null
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
      response_format: { type: "json_object" }
    });
    
    const features = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      parking: toggles.parking ? features.parking : null,
      garage: toggles.garage ? features.garage : null,
      garden: toggles.garden ? features.garden : null,
      newBuild: toggles.newBuild ? features.newBuild : null
    };
  } catch (error) {
    return { parking: null, garage: null, garden: null, newBuild: null };
  }
}

async function analyzeAdditionalCriteriaParallel(anythingElse: string) {
  const prompt = `Extract property criteria from: "${anythingElse}"
Return JSON array: [{"label": "criteria name", "description": "description", "type": "binary/continuum"}]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Return only valid JSON arrays" }, { role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });
    
    return JSON.parse(completion.choices[0]?.message?.content || '[]');
  } catch (error) {
    return [];
  }
}

async function analyzeCustomPreferencesParallel(anythingElse: string, basicInfo: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-custom-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anythingElse, propertyData: basicInfo })
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        customPreferences: data.customPreferences || [],
        failedAnalysis: data.failedAnalysis || []
      };
    }
  } catch (error) {
    console.log('⚠️ Custom preferences API failed');
  }
  
  return { customPreferences: [], failedAnalysis: [] };
}

async function analyzeLocationPreferencesParallel(postcode: string, propertyAddress: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-location-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationPreference: `near ${postcode}`, propertyAddress })
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('⚠️ Location preferences API failed');
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      listingText,
      url,
      scrapedPropertyData,
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

    console.log('🔍 Starting comprehensive property analysis...');
    console.log('📝 Listing text received:', listingText.substring(0, 200) + '...');
    console.log('🔗 URL:', url);

    // Step 1: Use scraped property data directly (no AI re-extraction needed)
    let basicInfo;
    
    if (scrapedPropertyData) {
      console.log('✅ Using scraped property data directly (no AI re-extraction)');
      basicInfo = {
        propertyAddress: scrapedPropertyData.address || null,
        listingPrice: scrapedPropertyData.price || null,
        area: scrapedPropertyData.address ? scrapedPropertyData.address.split(',')[1]?.trim() || null : null,
        floorAreaSqm: scrapedPropertyData.sizeInSqm || scrapedPropertyData.size || null,
        numberOfBedrooms: scrapedPropertyData.bedrooms || null,
        numberOfBathrooms: scrapedPropertyData.bathrooms || null,
        propertyType: scrapedPropertyData.propertyType || null,
        propertySaleHistory: null,
        listingUrl: url || null
      };
      console.log('📊 Using scraped data:', basicInfo);
    } else {
      console.log('⚠️ No scraped property data available, falling back to AI extraction');
      
      // Fallback to AI extraction if no scraped data
    const basicInfoPrompt = `
You are a property analysis expert. Extract the following information from this property listing text:

${listingText}

Return a JSON object with this exact structure:
{
  "propertyAddress": "Full property address or null",
  "listingPrice": "Price as number (e.g., 250000) or null",
  "area": "Area/location name (e.g., Manchester) or null",
  "floorAreaSqm": "Floor area in square meters as number or null",
  "numberOfBedrooms": "Number as integer or null",
  "numberOfBathrooms": "Number as integer or null", 
  "propertyType": "Type of property (e.g., Semi-Detached, Terraced, etc.) or null",
  "propertySaleHistory": "Array of {date, priceGBP, note} objects, string description, or null"
}

Guidelines:
- Extract only information that is clearly visible in the listing text
- For price, extract the number only (no currency symbols)
- For bedrooms/bathrooms, extract as integers
- For floor area, extract in square meters
- For sale history, if structured return array, if text return string, if none return null
- If any information is not available, use null
- Do not invent facts
- Return only valid JSON
`;

    const basicInfoCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a property analysis expert. Extract property information from Rightmove URLs. Return only valid JSON."
        },
        {
          role: "user",
          content: basicInfoPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

      basicInfo = JSON.parse(basicInfoCompletion.choices[0]?.message?.content || '{}');
      basicInfo.listingUrl = url || null; // Add the URL to AI extracted data too
      console.log('🤖 OpenAI API response (fallback):', basicInfo);
    }
    
    // Validate that property address was extracted (allow null for testing)
    if (!basicInfo.propertyAddress) {
      console.log('⚠️ Property address not found, using fallback');
      basicInfo.propertyAddress = 'Property Address Not Available';
    }
    
    // Calculate time on market
    let firstListedAt = null;
    let timeOnMarketDays = null;
    
    if (rightmove?.firstSeen) {
      firstListedAt = rightmove.firstSeen;
      if (rightmove.nowUtc) {
        const firstSeenDate = new Date(rightmove.firstSeen);
        const nowDate = new Date(rightmove.nowUtc);
        timeOnMarketDays = Math.floor((nowDate - firstSeenDate) / (1000 * 60 * 60 * 24));
      }
    }
    
    // Add time on market to basic info
    basicInfo.firstListedAt = firstListedAt;
    basicInfo.timeOnMarketDays = timeOnMarketDays;
    
    // Add the full listing text as description for custom preferences analysis
    basicInfo.description = listingText;

    // Enhanced Land Registry Analytics
    console.log('📊 Fetching enhanced Land Registry analytics...');
    console.log('📊 basicInfo.propertyAddress:', basicInfo.propertyAddress);
    console.log('📊 basicInfo.propertyType:', basicInfo.propertyType);
    
    let enhancedAnalytics = {
      fiveYearTrend: [],
      streetSalesCount: 0,
      streetAveragePrice: 0,
      pricePerSqm: { averagePricePerSqm: 0, salesCount: 0, totalProperties: 0 }
    };

    if (basicInfo.propertyAddress && basicInfo.propertyType) {
      console.log('📊 ✅ Both propertyAddress and propertyType are available, proceeding with enhanced analytics');
      try {
        // Extract postcode from address (handles both full and partial postcodes)
        // Try full postcode first: S10 5PR
        let postcodeMatch = basicInfo.propertyAddress.match(/([A-Z]{1,2}\d[A-Z]?\s?\d[A-Z]{2})/i);
        // If no match, try partial postcode: S10
        if (!postcodeMatch) {
          postcodeMatch = basicInfo.propertyAddress.match(/([A-Z]{1,2}\d{1,2}[A-Z]?)\b/i);
        }
        const postcode = postcodeMatch ? postcodeMatch[1].replace(/\s/g, '').toUpperCase() : null;
        console.log(`📍 Extracted postcode: "${postcode}" from address: "${basicInfo.propertyAddress}"`);
        
        // Extract street name from address (simple extraction)
        const addressParts = basicInfo.propertyAddress.split(',');
        const streetName = addressParts.length > 0 ? addressParts[0].trim() : null;

        if (postcode) {
          console.log(`📍 Analyzing for postcode: ${postcode}, property type: ${basicInfo.propertyType}`);
          console.log(`🔍 About to call fetchFiveYearTrend and fetchEnhancedPricePerSqm...`);
          
          // Fetch all enhanced analytics in parallel
          console.log(`🔍 About to call fetchFiveYearTrend with postcode="${postcode}", propertyType="${basicInfo.propertyType}"`);
          console.log(`🔍 About to call fetchEnhancedPricePerSqm with postcode="${postcode}", propertyType="${basicInfo.propertyType}"`);
          
          const [fiveYearTrend, pricePerSqm] = await Promise.all([
            fetchFiveYearTrend(postcode, basicInfo.propertyType).catch(error => {
              console.error('❌ fetchFiveYearTrend error:', error);
              return [];
            }),
            fetchEnhancedPricePerSqm(postcode, basicInfo.propertyType).catch(error => {
              console.error('❌ fetchEnhancedPricePerSqm error:', error);
              return { averagePricePerSqm: 0, salesCount: 0, totalProperties: 0 };
            })
          ]);
          
          console.log(`🔍 fetchFiveYearTrend returned:`, fiveYearTrend);
          console.log(`🔍 fetchEnhancedPricePerSqm returned:`, pricePerSqm);

          enhancedAnalytics.fiveYearTrend = fiveYearTrend;
          enhancedAnalytics.pricePerSqm = pricePerSqm;

          // Simple time on market calculation: today - listing date
          if (scrapedPropertyData && scrapedPropertyData.dateListedIso) {
            const today = new Date();
            const listingDate = new Date(scrapedPropertyData.dateListedIso);
            const timeDiff = today.getTime() - listingDate.getTime();
            const daysOnMarket = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            
            enhancedAnalytics.timeOnMarket = {
              estimatedDays: daysOnMarket,
              listingDate: scrapedPropertyData.dateListedIso,
              calculatedAt: today.toISOString()
            };
            
            console.log(`⏰ Time on market: ${daysOnMarket} days (listed on ${scrapedPropertyData.dateListedIso})`);
          } else {
            // Fallback if no listing date available
            enhancedAnalytics.timeOnMarket = {
              estimatedDays: 0,
              listingDate: null,
              calculatedAt: new Date().toISOString()
            };
            console.log(`⏰ No listing date available for time on market calculation`);
          }

          // Street analytics (if street name available)
          if (streetName) {
            console.log(`🏠 Analyzing street: ${streetName}`);
            const [streetSalesCount, streetAveragePrice] = await Promise.all([
              fetchStreetSalesCount(streetName, basicInfo.propertyType),
              fetchStreetAveragePrice(streetName, basicInfo.propertyType)
            ]);

            enhancedAnalytics.streetSalesCount = streetSalesCount;
            enhancedAnalytics.streetAveragePrice = streetAveragePrice;
          }
        }
      } catch (error) {
        console.error('❌ Enhanced analytics error:', error);
      }
    }

    console.log('✅ Enhanced analytics completed:', enhancedAnalytics);

    // Step 2-8: Analyze all features in parallel for better performance
    console.log('🚀 Starting parallel analysis of all features...');
    
    // Prepare parallel analysis promises
    const analysisPromises = [];
    
    // Binary features analysis (if toggles are enabled)
    if (toggles && Object.values(toggles).some(value => value === true)) {
      analysisPromises.push(
        analyzeBinaryFeaturesParallel(listingText, toggles, url)
      );
    } else {
      analysisPromises.push(Promise.resolve({
        parking: null,
        garage: null,
        garden: null,
        newBuild: null
      }));
    }
    
    // Additional criteria analysis (if anythingElse provided)
    if (anythingElse && anythingElse.trim()) {
      analysisPromises.push(
        analyzeAdditionalCriteriaParallel(anythingElse)
      );
    } else {
      analysisPromises.push(Promise.resolve([]));
    }
    
    // Custom preferences analysis (if anythingElse provided)
    if (anythingElse && anythingElse.trim()) {
      analysisPromises.push(
        analyzeCustomPreferencesParallel(anythingElse, basicInfo)
      );
    } else {
      analysisPromises.push(Promise.resolve({ customPreferences: [], failedAnalysis: [] }));
    }
    
    // Location preferences analysis (if userPreferences.postcode provided)
    if (userPreferences && userPreferences.postcode && basicInfo.propertyAddress) {
      analysisPromises.push(
        analyzeLocationPreferencesParallel(userPreferences.postcode, basicInfo.propertyAddress)
      );
    } else {
      analysisPromises.push(Promise.resolve(null));
    }
    
    // Execute all analyses in parallel
    const [
      binaryFeatures,
      additionalCriteria,
      customPreferencesResult,
      locationResult
    ] = await Promise.all(analysisPromises);
    
    console.log('✅ All parallel analyses completed');

    // Step 4: Process market graphs
    let marketGraphs = {
      postcode: null,
      propertyTypeNormalized: null,
      series: {
        postcodeSeries: [],
        propertyTypeSeries: []
      },
      source: "ppd",
      fallbackUsed: false,
      fallbackReason: null,
      chartHint: {
        x: "month",
        y: "avgPriceGBP",
        yFormat: "£,.0f",
        title: "Average Sold Price (last 5 years)"
      }
    };

    // Normalize property type
    if (basicInfo.propertyType) {
      const normalizedType = basicInfo.propertyType.toLowerCase();
      if (normalizedType.includes('detached') && !normalizedType.includes('semi')) {
        marketGraphs.propertyTypeNormalized = 'detached';
      } else if (normalizedType.includes('semi-detached')) {
        marketGraphs.propertyTypeNormalized = 'semi-detached';
      } else if (normalizedType.includes('terraced')) {
        marketGraphs.propertyTypeNormalized = 'terraced';
      } else if (normalizedType.includes('flat') || normalizedType.includes('apartment')) {
        marketGraphs.propertyTypeNormalized = 'flat';
      } else if (normalizedType.includes('bungalow')) {
        marketGraphs.propertyTypeNormalized = 'bungalow';
      } else if (normalizedType.includes('maisonette')) {
        marketGraphs.propertyTypeNormalized = 'maisonette';
      } else {
        marketGraphs.propertyTypeNormalized = 'other';
      }
    }

    // Check if PPD data is available and valid
    const hasValidPPD = ppdPostcodeSeries && ppdPropertyTypeSeries && 
                       ppdPostcodeSeries.length > 6 && ppdPropertyTypeSeries.length > 6;

    if (hasValidPPD) {
      marketGraphs.series.postcodeSeries = ppdPostcodeSeries;
      marketGraphs.series.propertyTypeSeries = ppdPropertyTypeSeries;
    } else {
      // Use fallback data
      marketGraphs.series.postcodeSeries = ukFallbackSeries || [];
      marketGraphs.series.propertyTypeSeries = ukFallbackSeries || [];
      marketGraphs.fallbackUsed = true;
      marketGraphs.fallbackReason = !ppdPostcodeSeries || !ppdPropertyTypeSeries ? 
        'PPD data missing' : 
        (ppdPostcodeSeries.length <= 6 || ppdPropertyTypeSeries.length <= 6 ? 
          'PPD data insufficient' : 'PPD data errored');
    }

    // Step 5: Calculate diagnostics
    const missing = [];
    const notes = [];
    let confidence = 1.0;

    if (!basicInfo.propertyAddress) missing.push('propertyAddress');
    if (!basicInfo.listingPrice) missing.push('listingPrice');
    if (!basicInfo.area) missing.push('area');
    if (!basicInfo.floorAreaSqm) missing.push('floorAreaSqm');
    if (!basicInfo.numberOfBedrooms) missing.push('numberOfBedrooms');
    if (!basicInfo.numberOfBathrooms) missing.push('numberOfBathrooms');
    if (!basicInfo.propertyType) missing.push('propertyType');

    confidence = 1.0 - (missing.length / 7);
    if (marketGraphs.fallbackUsed) {
      notes.push('Using fallback market data');
    }

    // Process parallel analysis results
    let customPreferences = customPreferencesResult.customPreferences || [];
    let failedAnalysis = customPreferencesResult.failedAnalysis || [];
    
    // Add location analysis result if available
    if (locationResult && locationResult.success) {
            customPreferences.push({
              label: `Distance to ${userPreferences.postcode}`,
              description: `Distance to preferred postcode ${userPreferences.postcode}`,
              importance: (userPreferences.postcodeImportance || 5) / 10,
        matchScore: locationResult.matchScore,
        reasoning: locationResult.reasoning,
              type: 'location',
              category: 'postcode',
        nearestDistance: locationResult.nearestDistance,
        nearestLocation: locationResult.nearestLocation
            });
    } else if (locationResult && !locationResult.success) {
      failedAnalysis.push({
              preference: `Distance to ${userPreferences.postcode}`,
        reason: locationResult.error || 'Could not analyze postcode distance'
      });
    }

    // Step 8: Compile comprehensive failed analysis
    let comprehensiveFailedAnalysis = [];
    
    // Add failed custom preferences
    if (failedAnalysis && failedAnalysis.length > 0) {
      comprehensiveFailedAnalysis = [...failedAnalysis];
    }
    
    // Add failed basic property data extraction
    if (basicInfo.propertyAddress === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Property Address",
        reason: "Could not extract from listing data"
      });
    }
    if (basicInfo.floorAreaSqm === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Property Size",
        reason: "Could not determine from listing or floor plan"
      });
    }
    if (basicInfo.numberOfBedrooms === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Number of Bedrooms",
        reason: "Could not extract from listing data"
      });
    }
    if (basicInfo.numberOfBathrooms === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Number of Bathrooms", 
        reason: "Could not extract from listing data"
      });
    }
    if (basicInfo.propertyType === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Property Type",
        reason: "Could not extract from listing data"
      });
    }
    
    // Add failed binary features analysis
    if (toggles?.parking && binaryFeatures.parking === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Parking",
        reason: "Could not determine from property description"
      });
    }
    if (toggles?.garage && binaryFeatures.garage === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Garage",
        reason: "Could not determine from property description"
      });
    }
    if (toggles?.garden && binaryFeatures.garden === null) {
      comprehensiveFailedAnalysis.push({
        preference: "Garden",
        reason: "Could not determine from property description"
      });
    }
    if (toggles?.newBuild && binaryFeatures.newBuild === null) {
      comprehensiveFailedAnalysis.push({
        preference: "New Build",
        reason: "Could not determine from property description"
      });
    }

    // Step 8: Compile final analysis with exact JSON structure
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
        failedAnalysis: comprehensiveFailedAnalysis,
        userPreferences: userPreferences || null,
        marketGraphs,
        diagnostics: {
          confidence,
          missing,
          notes
        }
      }
    };

    console.log('✅ Comprehensive analysis completed:', analysisResult);

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform comprehensive analysis',
      timestamp: new Date().toISOString()
    });
  }
}
