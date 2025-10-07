import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI-First Property Data Extraction
async function extractPropertyDataWithAI(html: string, url: string) {
  console.log('🤖 Starting AI-powered property data extraction...');
  
  // Clean HTML for better AI processing
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '') // Remove noscript
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  const aiPrompt = `
You are a property data extraction expert. Analyze this Rightmove property page HTML and extract the following information:

URL: ${url}

Extract these fields and return ONLY a valid JSON object:
{
  "address": "Full property address (street, city, postcode) or null",
  "price": "Price as number (e.g., 250000) or null",
  "bedrooms": "Number of bedrooms as integer or null",
  "bathrooms": "Number of bathrooms as integer or null",
  "propertyType": "Property type (e.g., 'Semi-Detached House', 'Terraced House', 'Flat') or null",
  "size": "Size description (e.g., '1,200 sq ft') or 'Ask agent' if not available or shows 'Ask agent'",
  "sizeInSqm": "Size in square meters as number or null",
  "description": "Full detailed property description text from the main content area (not meta description) - look for the main property description section with detailed text about the property features, rooms, and characteristics",
  "features": "Array of key features or null",
  "images": "Array of property image URLs or null",
  "firstSeen": "Date first listed (ISO format) or null",
  "nowUtc": "Current date (ISO format) or null",
  "daysOnMarket": "Number of days the property has been on the market (calculate from 'Added on' date to today) as integer or null"
}

IMPORTANT SIZE EXTRACTION:
- Look for size information in the main property details
- Check for floor plan URLs in the HTML (look for 'floorplans' in JSON data)
- If you find floor plan URLs, note them in the images array
- Look for any size measurements in the property description
- Check for room dimensions or area calculations
- Extract the FULL property description text, not just meta descriptions
- Look for the main property description section in the HTML (usually in a div with class containing "description" or similar)
- Look for phrases like "larger than others", "spacious", "generous", room dimensions
- The description should be the detailed property text, not the meta description
- Search for text that starts with "A rare opportunity" or similar detailed property descriptions
- Convert square feet to square meters (multiply by 0.092903)
- If size is not available or shows "Ask agent" on the page, return "Ask agent" as the size value
- This will trigger our smart fallback system to analyze the description and floor plan
- For daysOnMarket: Look for "Added on" date in the HTML (usually shows as "Added on DD/MM/YYYY" or similar)
- Convert the "Added on" date to a proper date format and calculate days between then and now
- Look for text patterns like "Added on 20/08/2025" or "Added on 20th August 2025"
- Calculate the difference in days between the "Added on" date and today's date

Guidelines:
- Extract ONLY information that is clearly visible in the HTML
- For price, extract the number only (no currency symbols)
- For bedrooms/bathrooms, extract as integers
- For size, convert to square meters if given in sq ft (multiply by 0.092903)
- For features, extract key property features as an array
- For images, extract full image URLs including floor plans
- If any information is not available, use null
- Do not invent or guess information
- Return ONLY valid JSON, no other text

HTML Content:
${cleanHtml.substring(0, 50000)} // Limit to 50k chars for API limits

IMPORTANT: Look for the main property description section in the HTML. It should contain detailed text about the property features, rooms, and characteristics. Do not use meta descriptions or short summaries.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a property data extraction expert. Extract property information from Rightmove HTML. Return only valid JSON."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const extractedData = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('✅ AI extraction completed successfully');
    
    // Validate and clean the extracted data
    return {
      address: extractedData.address || null,
      price: extractedData.price ? parseInt(extractedData.price.toString().replace(/[^\d]/g, '')) : null,
      bedrooms: extractedData.bedrooms ? parseInt(extractedData.bedrooms) : null,
      bathrooms: extractedData.bathrooms ? parseInt(extractedData.bathrooms) : null,
      propertyType: extractedData.propertyType || null,
      size: extractedData.size || null,
      sizeInSqm: extractedData.sizeInSqm ? parseFloat(extractedData.sizeInSqm) : null,
      description: extractedData.description || null,
      features: extractedData.features || null,
      images: extractedData.images || null,
      firstSeen: extractedData.firstSeen || null,
      nowUtc: extractedData.nowUtc || null,
      daysOnMarket: extractedData.daysOnMarket || null
    };
    
  } catch (error) {
    console.error('❌ AI extraction failed:', error);
    return {
      address: null,
      price: null,
      bedrooms: null,
      bathrooms: null,
      propertyType: null,
      size: null,
      sizeInSqm: null,
      description: null,
      features: null,
      images: null,
      firstSeen: null,
      nowUtc: null
    };
  }
}

// Fallback: Extract from structured data (JSON-LD, microdata)
async function extractFromStructuredData(html: string) {
  console.log('🔍 Trying structured data extraction as fallback...');
  
  const fallbackData = {
    address: null,
    price: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    size: null,
    sizeInSqm: null
  };

  try {
    // Try JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(match.replace(/<script[^>]*>|<\/script>/gi, ''));
          if (jsonLd['@type'] === 'RealEstateAgent' || jsonLd['@type'] === 'Product') {
            // Extract from JSON-LD
            if (jsonLd.address) fallbackData.address = jsonLd.address;
            if (jsonLd.offers?.price) fallbackData.price = parseInt(jsonLd.offers.price);
          }
        } catch (e) {
          // Continue to next JSON-LD block
        }
      }
    }

    // Try window.PAGE_MODEL as last resort
    const pageModelMatch = html.match(/window\.PAGE_MODEL\s*=\s*({[\s\S]*?});/);
    if (pageModelMatch && !fallbackData.address) {
      try {
        const pageModel = JSON.parse(pageModelMatch[1]);
        if (pageModel.propertyData) {
          const pd = pageModel.propertyData;
          if (pd.address) fallbackData.address = pd.address;
          if (pd.price) fallbackData.price = parseInt(pd.price.toString().replace(/[^\d]/g, ''));
          if (pd.bedrooms) fallbackData.bedrooms = parseInt(pd.bedrooms);
          if (pd.bathrooms) fallbackData.bathrooms = parseInt(pd.bathrooms);
          if (pd.propertyType) fallbackData.propertyType = pd.propertyType;
        }
      } catch (e) {
        console.log('❌ Failed to parse PAGE_MODEL:', e);
      }
    }
    
    console.log('📊 Structured data fallback result:', fallbackData);
    return fallbackData;
    
  } catch (error) {
    console.error('❌ Structured data extraction failed:', error);
    return fallbackData;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rightmoveUrl } = await request.json();
    
    if (!rightmoveUrl) {
      return NextResponse.json({ error: 'Rightmove URL is required' }, { status: 400 });
    }

    console.log('🏠 AI-First Scraping for Rightmove property:', rightmoveUrl);
    
    // Fetch the HTML content
    const response = await fetch(rightmoveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('✅ Successfully fetched HTML content');
    console.log('📄 HTML length:', html.length);
    
    // AI-First Approach: Use AI to extract all property data
    console.log('🤖 Using AI to extract property data...');
    const extractedData = await extractPropertyDataWithAI(html, rightmoveUrl);
    
    console.log('📊 AI extracted data:', extractedData);
    console.log('📅 Days on market extracted:', extractedData.daysOnMarket);

    // Validate that we got the essential data
    if (!extractedData.address || !extractedData.price) {
      console.warn('⚠️ AI extraction missing critical data, trying fallback methods...');
      
      // Fallback: Try to extract from structured data (JSON-LD, microdata)
      const fallbackData = await extractFromStructuredData(html);
      if (fallbackData.address) extractedData.address = fallbackData.address;
      if (fallbackData.price) extractedData.price = fallbackData.price;
      if (fallbackData.bedrooms) extractedData.bedrooms = fallbackData.bedrooms;
      if (fallbackData.bathrooms) extractedData.bathrooms = fallbackData.bathrooms;
      if (fallbackData.propertyType) extractedData.propertyType = fallbackData.propertyType;
      if (fallbackData.size) extractedData.size = fallbackData.size;
      if (fallbackData.sizeInSqm) extractedData.sizeInSqm = fallbackData.sizeInSqm;
    }

    // Check if we have essential data
    if (!extractedData.address || !extractedData.price) {
      console.warn('⚠️ Missing critical data after AI extraction and fallbacks');
      return NextResponse.json({
        success: false,
        error: 'Could not extract essential property data (address and price)',
        extractedData
      });
    }

    // Smart size extraction fallback system
    console.log('🔍 Debug: Checking smart fallback conditions...');
    console.log('🔍 extractedData.size:', extractedData.size);
    console.log('🔍 extractedData.sizeInSqm:', extractedData.sizeInSqm);
    console.log('🔍 Condition check:', !extractedData.size || !extractedData.sizeInSqm || extractedData.size === 'Ask agent' || extractedData.size === 'Ask Agent' || extractedData.size?.toLowerCase().includes('ask agent'));
    
    if (!extractedData.size || !extractedData.sizeInSqm || extractedData.size === 'Ask agent' || extractedData.size === 'Ask Agent' || extractedData.size?.toLowerCase().includes('ask agent')) {
      console.log('🧮 Size missing or "Ask agent", starting smart fallback analysis...');
      
      // Step 1: Try to extract size from property description
      if (extractedData.description && !extractedData.sizeInSqm) {
        console.log('📝 Step 1: Analyzing property description for size clues...');
        
        try {
          const descriptionAnalysisPrompt = `
Analyze this property description and look for any size information, room dimensions, or area measurements:

Description: ${extractedData.description}

Look for:
- Room dimensions (e.g., "3.5m x 4.2m", "12ft x 15ft")
- Total area mentions (e.g., "1,200 sq ft", "110 sqm")
- Size comparisons (e.g., "larger than others on the street")
- Any numerical measurements that could indicate property size

Return a JSON object with:
{
  "foundSize": boolean,
  "sizeText": "any size information found or null",
  "sizeInSqm": "size in square meters as number or null",
  "sizeInSqft": "size in square feet as number or null"
}

If no size information is found, return foundSize: false.
`;

          const descriptionResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a property analysis expert. Extract size information from property descriptions. Return only valid JSON."
              },
              {
                role: "user",
                content: descriptionAnalysisPrompt
              }
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: "json_object" }
          });

          const descriptionResult = JSON.parse(descriptionResponse.choices[0]?.message?.content || '{}');
          console.log('📝 Description analysis result:', descriptionResult);
          
          if (descriptionResult.foundSize && descriptionResult.sizeInSqm) {
            extractedData.sizeInSqm = parseFloat(descriptionResult.sizeInSqm);
            extractedData.size = descriptionResult.sizeText || `${Math.round(descriptionResult.sizeInSqm / 0.092903).toLocaleString()} sq ft`;
            console.log('✅ Size extracted from description:', extractedData.size, `(${extractedData.sizeInSqm} sqm)`);
          }
        } catch (error) {
          console.log('❌ Description analysis failed:', error);
        }
      }
      
      // Step 2: If still no size, analyze floor plan image
      if (!extractedData.sizeInSqm) {
        console.log('🖼️ Step 2: Analyzing floor plan image with computer vision...');
        
        try {
          // Extract floor plan URLs - improved pattern matching
      const floorplanUrlPattern = /https:\/\/media\.rightmove\.co\.uk\/[^"]*FLP[^"]*\.(?:png|jpg|jpeg)/gi;
      const floorplanUrls = [...html.matchAll(floorplanUrlPattern)].map(match => match[0]);
          
          // Also try to extract from JSON data structure
          if (floorplanUrls.length === 0) {
            const floorplanJsonMatch = html.match(/"floorplans":\[([^\]]*)\]/);
            if (floorplanJsonMatch) {
              const floorplanJsonUrls = [...floorplanJsonMatch[0].matchAll(/https:\/\/media\.rightmove\.co\.uk\/[^"]*\.(?:png|jpg|jpeg)/gi)];
              floorplanUrls.push(...floorplanJsonUrls.map(match => match[0]));
            }
          }
          
          // Additional fallback: look for any image URLs that might be floor plans
          if (floorplanUrls.length === 0) {
            const allImageUrls = [...html.matchAll(/https:\/\/media\.rightmove\.co\.uk\/[^"]*\.(?:png|jpg|jpeg)/gi)];
            const potentialFloorplans = allImageUrls
              .map(match => match[0])
              .filter(url => url.includes('FLP') || url.includes('floorplan') || url.includes('floor'));
            floorplanUrls.push(...potentialFloorplans);
          }
      
      console.log('🖼️ Found floor plan URLs:', floorplanUrls);
      console.log('🖼️ Total floor plan URLs found:', floorplanUrls.length);
      
      if (floorplanUrls.length > 0) {
        try {
          // Download and analyze the first floor plan image
          const floorplanUrl = floorplanUrls[0];
          console.log('📥 Downloading floor plan image:', floorplanUrl);
          
          const imageResponse = await fetch(floorplanUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBase64 = Buffer.from(imageBuffer).toString('base64');
          
          console.log('🖼️ Analyzing floor plan image with computer vision...');
          
          const visionResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this floor plan image and extract room dimensions. Look for measurements in meters or feet (e.g., '3.5m x 4.2m' or '12ft x 15ft'). Calculate the total floor area by summing all room areas. Return a JSON object with totalSizeSqm, totalSizeSqft, roomBreakdown array, and calculationMethod."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${imageBase64}`
                    }
                  }
                ]
              }
            ],
            temperature: 0.1
          });
          
          const visionContent = visionResponse.choices[0].message.content || '{}';
          console.log('🖼️ Raw vision response:', visionContent);
          
          let visionResult;
          try {
            visionResult = JSON.parse(visionContent);
          } catch (parseError) {
            console.log('❌ Failed to parse vision response as JSON:', parseError);
            console.log('🔄 Trying to extract JSON from response...');
            
            // Try to extract JSON from the response if it's wrapped in text
            const jsonMatch = visionContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                visionResult = JSON.parse(jsonMatch[0]);
                console.log('✅ Successfully extracted JSON from response');
              } catch (secondError) {
                console.log('❌ Still failed to parse extracted JSON:', secondError);
                visionResult = { totalSizeSqm: null, error: 'Failed to parse AI response' };
              }
            } else {
              console.log('❌ No JSON found in response');
              visionResult = { totalSizeSqm: null, error: 'No JSON found in AI response' };
            }
          }
          
          console.log('🖼️ Floor plan image analysis result:', visionResult);
          
          if (visionResult.totalSizeSqm && visionResult.totalSizeSqm > 0) {
            // Implement fail-safes for AI calculation accuracy
            if (visionResult.roomBreakdown && visionResult.roomBreakdown.length > 0) {
              const manualSum = visionResult.roomBreakdown.reduce((sum, room) => sum + (room.areaSqm || 0), 0);
              const aiTotal = visionResult.totalSizeSqm;
              const discrepancy = Math.abs(aiTotal - manualSum);
              const discrepancyPercentage = (discrepancy / aiTotal) * 100;
              
              console.log('🔍 FAIL-SAFE 1: Manual verification:');
              console.log('📐 Manual sum of rooms:', manualSum, 'sqm');
              console.log('🤖 AI total:', aiTotal, 'sqm');
              console.log('📊 Discrepancy:', discrepancy, 'sqm');
              console.log('📈 Discrepancy percentage:', discrepancyPercentage.toFixed(1), '%');
              
              if (discrepancyPercentage > 5) {
                console.log('⚠️ FAIL-SAFE TRIGGERED: Using manual calculation instead of AI total');
                extractedData.sizeInSqm = Math.round(manualSum * 100) / 100;
                extractedData.size = `${Math.round(manualSum / 0.092903).toLocaleString()} sq ft`;
                console.log('✅ Final corrected size:', extractedData.size, `(${extractedData.sizeInSqm} sqm)`);
              } else {
                extractedData.sizeInSqm = visionResult.totalSizeSqm;
                extractedData.size = `${Math.round(visionResult.totalSizeSqm / 0.092903).toLocaleString()} sq ft`;
                console.log('✅ Using AI calculated size:', extractedData.size, `(${extractedData.sizeInSqm} sqm)`);
              }
              
              // Additional fail-safes
              if (extractedData.sizeInSqm < 50 || extractedData.sizeInSqm > 500) {
                console.log('⚠️ FAIL-SAFE 2: Size outside reasonable range (50-500 sqm)');
              }
              
              // Verify individual room calculations
              for (const room of visionResult.roomBreakdown) {
                if (room.dimensions && room.areaSqm) {
                  const dimMatch = room.dimensions.match(/(\d+(?:\.\d+)?)\s*[mx]\s*(\d+(?:\.\d+)?)/);
                  if (dimMatch) {
                    const length = parseFloat(dimMatch[1]);
                    const width = parseFloat(dimMatch[2]);
                    const expectedArea = length * width;
                    const actualArea = room.areaSqm;
                    const roomDiscrepancy = Math.abs(expectedArea - actualArea);
                    
                    if (roomDiscrepancy > 0.5) {
                      console.log('⚠️ FAIL-SAFE 3: Room calculation discrepancy for', room.room, ':', roomDiscrepancy.toFixed(2), 'sqm');
                    }
                  }
                }
              }
            } else {
              extractedData.sizeInSqm = visionResult.totalSizeSqm;
              extractedData.size = `${Math.round(visionResult.totalSizeSqm / 0.092903).toLocaleString()} sq ft`;
              console.log('✅ Using AI calculated size (no room breakdown):', extractedData.size, `(${extractedData.sizeInSqm} sqm)`);
            }
          }
        } catch (error) {
          console.log('❌ Floor plan analysis failed:', error);
            }
          } else {
            console.log('⚠️ No floor plan URLs found for analysis');
          }
        } catch (error) {
          console.log('❌ Floor plan URL extraction failed:', error);
        }
      }
    }

    // Fallback: Extract days on market if AI didn't find it
    if (!extractedData.daysOnMarket) {
      console.log('📅 AI didn\'t extract days on market, trying regex fallback...');
      
      // Look for "Added on" or "Reduced on" date patterns
      // PRIORITY: Original listing date first, then reduction date
      const addedOnPatterns = [
        /"added":"(\d{8})"/i,  // JSON format: "added":"20240419" - ORIGINAL LISTING DATE
        /Added on (\d{1,2}\/\d{1,2}\/\d{4})/i,
        /Added on (\d{1,2}th \w+ \d{4})/i,
        /Added on (\d{1,2} \w+ \d{4})/i,
        /Added on (\d{4}-\d{2}-\d{2})/i,
        /"listingUpdateReason":"Added on (\d{1,2}\/\d{1,2}\/\d{4})"/i,
        // Only use reduction date if no original date found
        /Reduced on (\d{1,2}\/\d{1,2}\/\d{4})/i,
        /Reduced on (\d{1,2}th \w+ \d{4})/i,
        /Reduced on (\d{1,2} \w+ \d{4})/i,
        /Reduced on (\d{4}-\d{2}-\d{2})/i,
        /"listingUpdateReason":"Reduced on (\d{1,2}\/\d{1,2}\/\d{4})"/i
      ];
      
      // Also try a more general search for any "Added on" or "Reduced on" text
      const addedOnText = html.match(/Added on [^<>\n]+/i);
      const reducedOnText = html.match(/Reduced on [^<>\n]+/i);
      if (addedOnText) {
        console.log('🔍 Found "Added on" text:', addedOnText[0]);
      }
      if (reducedOnText) {
        console.log('🔍 Found "Reduced on" text:', reducedOnText[0]);
      }
      
      console.log('🔍 Searching for "Added on" or "Reduced on" patterns in HTML...');
      console.log('📄 HTML length:', html.length);
      
      for (const pattern of addedOnPatterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            let addedDate;
            
            // Handle YYYYMMDD format (e.g., "20250820")
            if (match[1].length === 8 && /^\d{8}$/.test(match[1])) {
              const year = match[1].substring(0, 4);
              const month = match[1].substring(4, 6);
              const day = match[1].substring(6, 8);
              addedDate = new Date(`${year}-${month}-${day}`);
            } else if (match[1].includes('/')) {
              // Handle DD/MM/YYYY format (e.g., "16/07/2025")
              const parts = match[1].split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                addedDate = new Date(`${year}-${month}-${day}`);
              } else {
                addedDate = new Date(match[1]);
              }
            } else {
              addedDate = new Date(match[1]);
            }
            
            const today = new Date();
            const daysDiff = Math.floor((today - addedDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 0) {
              extractedData.daysOnMarket = daysDiff;
              extractedData.firstSeen = addedDate.toISOString();
              console.log('✅ Days on market calculated via regex:', daysDiff, 'days');
              console.log('📅 Added date:', addedDate.toISOString());
              console.log('📊 Date source:', match[0].includes('added') ? 'Original listing date (JSON)' : 
                         match[0].includes('Reduced') ? 'Reduction date (fallback)' : 'Added on date');
              break;
            }
          } catch (error) {
            console.log('❌ Date parsing failed:', error);
          }
        }
      }
    }

    // Use OpenAI API to extract missing property details
    const missingFields = [];
    if (!extractedData.bedrooms) missingFields.push('bedrooms');
    if (!extractedData.bathrooms) missingFields.push('bathrooms');
    if (!extractedData.propertyType) missingFields.push('propertyType');
    if (!extractedData.description) missingFields.push('description');

    if (missingFields.length > 0) {
      console.log('🤖 Missing fields, calling OpenAI for:', missingFields);
      
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a property analysis expert. Extract missing property information from Rightmove HTML. Return only valid JSON."
            },
            {
              role: "user",
              content: `
Extract the following missing fields from this Rightmove property page:

Missing fields: ${missingFields.join(', ')}

HTML: ${html.substring(0, 30000)}

Return a JSON object with the missing fields only. Use null if not found.
`
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        });
        
        const aiResult = JSON.parse(aiResponse.choices[0]?.message?.content || '{}');
        console.log('🤖 OpenAI extracted data:', aiResult);

        // Merge the AI results
        if (aiResult.bedrooms) extractedData.bedrooms = parseInt(aiResult.bedrooms);
        if (aiResult.bathrooms) extractedData.bathrooms = parseInt(aiResult.bathrooms);
        if (aiResult.propertyType) extractedData.propertyType = aiResult.propertyType;
        if (aiResult.description) extractedData.description = aiResult.description;
        
      } catch (error) {
        console.log('❌ OpenAI extraction failed:', error);
      }
    }

    // Extract property images
    const imageUrlPattern = /https:\/\/media\.rightmove\.co\.uk\/[^"]*IMG[^"]*\.(?:png|jpg|jpeg)/gi;
    const imageUrls = [...html.matchAll(imageUrlPattern)].map(match => match[0]).slice(0, 5);
    console.log('📸 Found property images:', imageUrls.length);

    // Final validation
    const finalData = {
      success: true,
      propertyDetails: {
        address: extractedData.address,
        price: extractedData.price,
        bedrooms: extractedData.bedrooms,
        bathrooms: extractedData.bathrooms,
        propertyType: extractedData.propertyType,
        size: extractedData.size,
        sizeInSqm: extractedData.sizeInSqm,
        description: extractedData.description,
        features: extractedData.features,
        firstSeen: extractedData.firstSeen,
        nowUtc: extractedData.nowUtc || new Date().toISOString(),
        daysOnMarket: extractedData.daysOnMarket
      },
      propertyImages: imageUrls,
      listingText: html.substring(0, 10000), // First 10k chars for analysis
      extractedData
    };

    console.log('✅ Final extracted data:', finalData.propertyDetails);
    return NextResponse.json(finalData);

  } catch (error) {
    console.error('❌ Scraping failed:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      extractedData: null
    });
  }
}