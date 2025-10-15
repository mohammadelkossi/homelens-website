import { NextRequest, NextResponse } from 'next/server';
import { scrapeWithApify } from '@/lib/apifyScraper';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract property size from floor plan using OpenAI Vision API
 */
async function extractSizeFromFloorplan(floorplanUrl: string): Promise<{ sizeInSqm: number | null; sizeInSqft: number | null }> {
  console.log('🖼️ Extracting size from floor plan:', floorplanUrl);
  
  try {
    // Download the floor plan image
    const imageResponse = await fetch(floorplanUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch floor plan: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    console.log('🤖 Analyzing floor plan with OpenAI Vision...');
    
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this floor plan image and extract the total property size.

TASK:
1. Identify all room dimensions shown on the floor plan (e.g., "3.5m x 4.2m" or "12ft x 15ft")
2. Calculate the area of each room
3. Sum all room areas to get the total property size
4. Provide the result in both square meters and square feet

IMPORTANT:
- Look carefully for dimension labels on each room
- Only include habitable rooms (bedrooms, living rooms, kitchen, etc.)
- Do NOT include garages, sheds, or outdoor spaces unless they're clearly part of the main living area
- Double-check your calculations

Return a JSON object with this exact structure:
{
  "totalSizeSqm": <number or null>,
  "totalSizeSqft": <number or null>,
  "roomBreakdown": [
    {
      "room": "Room name",
      "dimensions": "e.g., 3.5m x 4.2m",
      "areaSqm": <number>,
      "areaSqft": <number>
    }
  ],
  "calculationMethod": "Description of how you calculated the total",
  "confidence": "high/medium/low"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });
    
    const visionContent = visionResponse.choices[0].message.content || '{}';
    console.log('🖼️ Vision API response:', visionContent);
    
    const visionResult = JSON.parse(visionContent);
    
    // Validation and fail-safes
    if (visionResult.totalSizeSqm && visionResult.roomBreakdown?.length > 0) {
      const manualSum = visionResult.roomBreakdown.reduce((sum: number, room: any) => sum + (room.areaSqm || 0), 0);
      const aiTotal = visionResult.totalSizeSqm;
      const discrepancy = Math.abs(aiTotal - manualSum);
      const discrepancyPercentage = (discrepancy / aiTotal) * 100;
      
      console.log('🔍 Validation:');
      console.log('  Manual sum:', manualSum, 'sqm');
      console.log('  AI total:', aiTotal, 'sqm');
      console.log('  Discrepancy:', discrepancyPercentage.toFixed(1), '%');
      
      if (discrepancyPercentage > 5) {
        console.log('⚠️ Using manual calculation due to discrepancy');
        return {
          sizeInSqm: Math.round(manualSum * 100) / 100,
          sizeInSqft: Math.round(manualSum / 0.092903)
        };
      }
    }
    
    return {
      sizeInSqm: visionResult.totalSizeSqm || null,
      sizeInSqft: visionResult.totalSizeSqft || null
    };
    
  } catch (error) {
    console.error('❌ Floor plan analysis failed:', error);
    return { sizeInSqm: null, sizeInSqft: null };
  }
}

/**
 * Extract first listed date from HTML using OpenAI
 */
async function extractFirstListedDateFromHTML(html: string): Promise<{ firstListedDate: string | null; daysOnMarket: number | null }> {
  console.log('📅 Extracting first listed date from HTML...');
  
  try {
    // Clean HTML
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .substring(0, 30000); // Limit to 30k chars
    
    console.log('🤖 Analyzing HTML with OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a property listing analysis expert. Extract the FIRST LISTED DATE from Rightmove property HTML. Return only valid JSON."
        },
        {
          role: "user",
          content: `Analyze this Rightmove property page HTML and find the ORIGINAL FIRST LISTED DATE (not price reduction dates).

IMPORTANT PATTERNS TO LOOK FOR:
1. JSON data with "added":"YYYYMMDD" format (e.g., "added":"20250603") - THIS IS THE MOST RELIABLE
2. "Added on DD/MM/YYYY" text
3. "Added on DD Month YYYY" text
4. "First listed" or similar phrases

IGNORE:
- "Reduced on" dates (these are price reductions, NOT the original listing date)
- "listingUpdateReason" that says "Reduced on..." (this is NOT the first listed date)

HTML Content:
${cleanHtml}

Return a JSON object with this exact structure:
{
  "firstListedDate": "ISO format date string (YYYY-MM-DD) or null",
  "dateSource": "Description of where you found the date (e.g., 'JSON added field', 'Added on text', etc.)",
  "daysOnMarket": <number of days from first listed to today, or null>,
  "confidence": "high/medium/low",
  "rawDateFound": "The exact date string you found in the HTML"
}

Today's date for reference: ${new Date().toISOString().split('T')[0]}`
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content || '{}';
    console.log('📅 OpenAI date extraction response:', content);
    
    const result = JSON.parse(content);
    
    return {
      firstListedDate: result.firstListedDate || null,
      daysOnMarket: result.daysOnMarket || null
    };
    
  } catch (error) {
    console.error('❌ Date extraction failed:', error);
    return { firstListedDate: null, daysOnMarket: null };
  }
}

/**
 * Main scraping workflow:
 * 1. Use Apify as primary scraper
 * 2. If size is missing, extract from floor plan with OpenAI Vision
 * 3. If first listed date shows "Reduced on", extract actual date from HTML with OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    const { rightmoveUrl } = await request.json();
    
    if (!rightmoveUrl) {
      return NextResponse.json({ error: 'Rightmove URL is required' }, { status: 400 });
    }

    console.log('🚀 Starting Apify-first scraping workflow for:', rightmoveUrl);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // STEP 1: Scrape with Apify
    console.log('\n📍 STEP 1: Scraping with Apify...');
    const apifyResult = await scrapeWithApify(rightmoveUrl);
    
    if (!apifyResult.success || !apifyResult.data) {
      console.error('❌ Apify scraping failed:', apifyResult.error);
      return NextResponse.json({
        success: false,
        error: `Apify scraping failed: ${apifyResult.error}`,
        scrapingMethod: 'apify_failed'
      }, { status: 500 });
    }
    
    const propertyData = apifyResult.data;
    console.log('✅ Apify scraping successful!');
    console.log('📊 Apify data summary:');
    console.log('  - Address:', propertyData.address);
    console.log('  - Price:', propertyData.price);
    console.log('  - Size:', propertyData.sizeInSqm, 'sqm');
    console.log('  - Bedrooms:', propertyData.bedrooms);
    console.log('  - Bathrooms:', propertyData.bathrooms);
    console.log('  - First Listed:', propertyData.firstVisibleDate);
    console.log('  - Listing Update:', propertyData.listingUpdateDate);
    console.log('  - Floor plans:', propertyData.floorplans?.length || 0);
    
    // STEP 2: Check if size is missing and extract from floor plan
    let sizeExtractionMethod = 'apify';
    
    if (!propertyData.sizeInSqm && propertyData.floorplans && propertyData.floorplans.length > 0) {
      console.log('\n📍 STEP 2: Size missing, extracting from floor plan...');
      console.log('🖼️ Floor plans available:', propertyData.floorplans.length);
      
      // Try to extract size from the first floor plan
      const floorplanUrl = propertyData.floorplans[0];
      const sizeResult = await extractSizeFromFloorplan(floorplanUrl);
      
      if (sizeResult.sizeInSqm) {
        propertyData.sizeInSqm = sizeResult.sizeInSqm;
        propertyData.size = sizeResult.sizeInSqm;
        sizeExtractionMethod = 'openai_vision_floorplan';
        console.log('✅ Size extracted from floor plan:', sizeResult.sizeInSqm, 'sqm');
      } else {
        console.log('⚠️ Could not extract size from floor plan');
      }
    } else if (propertyData.sizeInSqm) {
      console.log('\n📍 STEP 2: Size already available from Apify, skipping extraction');
    } else {
      console.log('\n📍 STEP 2: No size data and no floor plans available');
    }
    
    // STEP 3: Check if first listed date needs to be extracted from HTML
    let dateExtractionMethod = 'apify';
    
    const needsDateExtraction = 
      !propertyData.firstVisibleDate || 
      propertyData.listingUpdateDate?.toLowerCase().includes('reduced on');
    
    if (needsDateExtraction) {
      console.log('\n📍 STEP 3: First listed date missing or shows reduction, extracting from HTML...');
      console.log('  - First visible date from Apify:', propertyData.firstVisibleDate);
      console.log('  - Listing update:', propertyData.listingUpdateDate);
      
      // Fetch HTML for date extraction
      console.log('📥 Fetching property HTML...');
      const htmlResponse = await fetch(rightmoveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!htmlResponse.ok) {
        console.error('❌ Failed to fetch HTML:', htmlResponse.status);
      } else {
        const html = await htmlResponse.text();
        console.log('✅ HTML fetched, length:', html.length);
        
        const dateResult = await extractFirstListedDateFromHTML(html);
        
        if (dateResult.firstListedDate) {
          propertyData.firstVisibleDate = dateResult.firstListedDate;
          dateExtractionMethod = 'openai_html_analysis';
          console.log('✅ First listed date extracted:', dateResult.firstListedDate);
          console.log('  - Days on market:', dateResult.daysOnMarket);
        } else {
          console.log('⚠️ Could not extract first listed date from HTML');
        }
      }
    } else {
      console.log('\n📍 STEP 3: First listed date already available from Apify, skipping extraction');
    }
    
    // STEP 4: Return comprehensive result
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SCRAPING COMPLETE');
    console.log('📊 Final data summary:');
    console.log('  - Address:', propertyData.address);
    console.log('  - Price: £' + propertyData.price?.toLocaleString());
    console.log('  - Size:', propertyData.sizeInSqm, 'sqm (' + sizeExtractionMethod + ')');
    console.log('  - First Listed:', propertyData.firstVisibleDate, '(' + dateExtractionMethod + ')');
    console.log('  - Bedrooms:', propertyData.bedrooms);
    console.log('  - Bathrooms:', propertyData.bathrooms);
    console.log('  - Features:', propertyData.features?.length || 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return NextResponse.json({
      success: true,
      propertyData: {
        address: propertyData.address,
        price: propertyData.price,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        propertyType: propertyData.propertyType,
        size: propertyData.sizeInSqm,
        sizeInSqm: propertyData.sizeInSqm,
        description: propertyData.description,
        features: propertyData.features,
        images: propertyData.images,
        coordinates: propertyData.coordinates,
        firstVisibleDate: propertyData.firstVisibleDate,
        listingUpdateDate: propertyData.listingUpdateDate,
        priceHistory: propertyData.priceHistory,
        epc: propertyData.epc,
        floorplans: propertyData.floorplans,
        tenure: propertyData.tenure,
        councilTaxBand: propertyData.councilTaxBand,
        agent: propertyData.agent
      },
      scrapingMethod: 'apify_with_openai_fallback',
      extractionMethods: {
        size: sizeExtractionMethod,
        firstListedDate: dateExtractionMethod
      },
      listingText: propertyData.description || ''
    });
    
  } catch (error) {
    console.error('❌ Scraping workflow failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      scrapingMethod: 'failed'
    }, { status: 500 });
  }
}

