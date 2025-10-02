import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rightmoveUrl } = body;

    if (!rightmoveUrl) {
      return NextResponse.json({
        success: false,
        error: 'Rightmove URL is required'
      });
    }

    console.log('🏠 Scraping Rightmove property:', rightmoveUrl);

    // Fetch HTML content
    const response = await fetch(rightmoveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    console.log('✅ Successfully fetched HTML content');
    console.log('📄 HTML length:', html.length);

    // First, try to extract key data from JSON structure in HTML
    console.log('🔍 Looking for JSON data in HTML...');
    let extractedData = {
      address: null,
      price: null,
      bedrooms: null,
      bathrooms: null,
      propertyType: null,
      size: null,
      sizeInSqm: null,
      description: null
    };

    // Look for JSON data in script tags - use a more robust approach
    console.log('🔍 Looking for PAGE_MODEL in HTML...');
    const scriptMatch = html.match(/window\.PAGE_MODEL\s*=\s*({[\s\S]*?});\s*<\/script>/);
    console.log('🔍 Script match found:', !!scriptMatch);
    if (scriptMatch) {
      try {
        const pageModel = JSON.parse(scriptMatch[1]);
        console.log('📊 Found PAGE_MODEL JSON data');
        
        // Extract from propertyData
        if (pageModel.propertyData) {
          const pd = pageModel.propertyData;
          
          // Extract address
          if (pd.address?.displayAddress) {
            extractedData.address = pd.address.displayAddress;
          }
          
          // Extract price
          if (pd.prices?.primaryPrice) {
            const priceStr = pd.prices.primaryPrice.replace(/[£,]/g, '');
            extractedData.price = parseInt(priceStr);
          }
          
          // Extract bedrooms and bathrooms
          if (pd.bedrooms) extractedData.bedrooms = pd.bedrooms;
          if (pd.bathrooms) extractedData.bathrooms = pd.bathrooms;
          
          // Extract property type
          if (pd.propertySubType) {
            extractedData.propertyType = pd.propertySubType;
          }
          
          // Extract size from sizings array
          if (pd.sizings && Array.isArray(pd.sizings)) {
            const sqftSize = pd.sizings.find(s => s.unit === 'sqft');
            const sqmSize = pd.sizings.find(s => s.unit === 'sqm');
            
            if (sqftSize) {
              extractedData.size = `${sqftSize.minimumSize.toLocaleString()} sq ft`;
              extractedData.sizeInSqm = sqmSize ? sqmSize.minimumSize : Math.round(sqftSize.minimumSize * 0.092903);
            }
          }
          
          // Extract description
          if (pd.text?.description) {
            extractedData.description = pd.text.description;
          }
        }
        
        console.log('📊 Extracted from JSON:', extractedData);
      } catch (error) {
        console.log('❌ Failed to parse JSON data:', error);
        console.log('🔍 Trying alternative extraction methods...');
        
        // Fallback: try to extract specific fields using regex
        const addressMatch = html.match(/"displayAddress":"([^"]+)"/);
        if (addressMatch) extractedData.address = addressMatch[1];
        
        const priceMatch = html.match(/"primaryPrice":"£([0-9,]+)"/);
        if (priceMatch) extractedData.price = parseInt(priceMatch[1].replace(/,/g, ''));
        
        const bedroomsMatch = html.match(/"bedrooms":(\d+)/);
        if (bedroomsMatch) extractedData.bedrooms = parseInt(bedroomsMatch[1]);
        
        const bathroomsMatch = html.match(/"bathrooms":(\d+)/);
        if (bathroomsMatch) extractedData.bathrooms = parseInt(bathroomsMatch[1]);
        
        const propertyTypeMatch = html.match(/"propertySubType":"([^"]+)"/);
        if (propertyTypeMatch) extractedData.propertyType = propertyTypeMatch[1];
        
        // Extract size from sizings array
        const sqftMatch = html.match(/"unit":"sqft"[^}]*"minimumSize":(\d+)/);
        const sqmMatch = html.match(/"unit":"sqm"[^}]*"minimumSize":(\d+)/);
        if (sqftMatch) {
          extractedData.size = `${parseInt(sqftMatch[1]).toLocaleString()} sq ft`;
          if (sqmMatch) {
            extractedData.sizeInSqm = parseInt(sqmMatch[1]);
          } else {
            extractedData.sizeInSqm = Math.round(parseInt(sqftMatch[1]) * 0.092903);
          }
        }
        
        console.log('📊 Extracted from regex fallback:', extractedData);
      }
    } else {
      console.log('❌ No PAGE_MODEL found, trying direct regex extraction...');
      
      // Direct regex extraction as fallback
      const addressMatch = html.match(/"displayAddress":"([^"]+)"/);
      if (addressMatch) extractedData.address = addressMatch[1];
      
      const priceMatch = html.match(/"primaryPrice":"£([0-9,]+)"/);
      if (priceMatch) extractedData.price = parseInt(priceMatch[1].replace(/,/g, ''));
      
      const bedroomsMatch = html.match(/"bedrooms":(\d+)/);
      if (bedroomsMatch) extractedData.bedrooms = parseInt(bedroomsMatch[1]);
      
      const bathroomsMatch = html.match(/"bathrooms":(\d+)/);
      if (bathroomsMatch) extractedData.bathrooms = parseInt(bathroomsMatch[1]);
      
      const propertyTypeMatch = html.match(/"propertySubType":"([^"]+)"/);
      if (propertyTypeMatch) extractedData.propertyType = propertyTypeMatch[1];
      
      // Extract size from sizings array
      const sqftMatch = html.match(/"unit":"sqft"[^}]*"minimumSize":(\d+)/);
      const sqmMatch = html.match(/"unit":"sqm"[^}]*"minimumSize":(\d+)/);
      if (sqftMatch) {
        extractedData.size = `${parseInt(sqftMatch[1]).toLocaleString()} sq ft`;
        if (sqmMatch) {
          extractedData.sizeInSqm = parseInt(sqmMatch[1]);
        } else {
          extractedData.sizeInSqm = Math.round(parseInt(sqftMatch[1]) * 0.092903);
        }
      }
      
      console.log('📊 Extracted from direct regex:', extractedData);
    }

    // If size is still missing, try to extract from floor plan data
    if (!extractedData.size || !extractedData.sizeInSqm) {
      console.log('🔍 Size missing, checking floor plan data...');
      
      // Look for floor plan size information
      const floorplanSizeMatch = html.match(/"floorplans":\[[^\]]*"url":"([^"]*floorplan[^"]*)"[^\]]*\]/i);
      if (floorplanSizeMatch) {
        console.log('📐 Found floor plan URL:', floorplanSizeMatch[1]);
      }
      
      // Look for size in floor plan captions or descriptions
      const floorplanCaptionMatch = html.match(/"floorplans":\[[^\]]*"caption":"([^"]*sq[^"]*)"[^\]]*\]/i);
      if (floorplanCaptionMatch) {
        console.log('📐 Found floor plan caption with size:', floorplanCaptionMatch[1]);
        const sizeMatch = floorplanCaptionMatch[1].match(/(\d+(?:,\d+)*)\s*sq\s*ft/i);
        if (sizeMatch) {
          extractedData.size = `${sizeMatch[1]} sq ft`;
          const sqft = parseInt(sizeMatch[1].replace(/,/g, ''));
          extractedData.sizeInSqm = Math.round(sqft * 0.092903);
          console.log('📐 Extracted size from floor plan:', extractedData.size);
        }
      }
      
      // Look for any size mentions in the HTML that we might have missed
      const anySizeMatch = html.match(/(\d+(?:,\d+)*)\s*sq\s*ft/i) || html.match(/(\d+)\s*sq\s*m/i);
      if (anySizeMatch && !extractedData.size) {
        console.log('📐 Found size mention in HTML:', anySizeMatch[0]);
        if (anySizeMatch[0].includes('sq ft')) {
          extractedData.size = anySizeMatch[0];
          const sqft = parseInt(anySizeMatch[1].replace(/,/g, ''));
          extractedData.sizeInSqm = Math.round(sqft * 0.092903);
        } else if (anySizeMatch[0].includes('sq m')) {
          extractedData.sizeInSqm = parseInt(anySizeMatch[1]);
          extractedData.size = `${Math.round(parseInt(anySizeMatch[1]) / 0.092903).toLocaleString()} sq ft`;
        }
        console.log('📐 Extracted size from HTML mention:', extractedData.size);
      }
    }

    // If size is still missing and we have a floor plan, try AI calculation from room dimensions
    if ((!extractedData.size || !extractedData.sizeInSqm) && html.includes('floorplan')) {
      console.log('🧮 Size still missing, attempting AI calculation from floor plan room dimensions...');
      
      // First try to find room dimensions in HTML text
      const floorplanCalculationPrompt = `
You are a property size calculation expert. Analyze this Rightmove property listing HTML to find room dimensions in floor plans or property descriptions, then calculate the total property size.

${html.substring(0, 25000)} // Limit HTML to first 25k chars

INSTRUCTIONS:
1. Look for room dimensions in the HTML (e.g., "7m x 3m", "12ft x 8ft", "4.5m x 2.5m")
2. Calculate the area of each room (length × width)
3. Add up all room areas to get total property size
4. Convert to both square meters and square feet
5. Return ONLY a JSON object with this structure:

{
  "totalSizeSqm": <number>,
  "totalSizeSqft": <number>,
  "roomBreakdown": [
    {"room": "<room name>", "dimensions": "<dimensions>", "areaSqm": <number>}
  ],
  "calculationMethod": "<how you calculated it>"
}

If no room dimensions are found, return:
{
  "totalSizeSqm": null,
  "totalSizeSqft": null,
  "roomBreakdown": [],
  "calculationMethod": "No room dimensions found in floor plan or description"
}

Be precise with calculations and only use dimensions that are clearly stated in the HTML.
`;

      try {
        const floorplanCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a property size calculation expert. Calculate total property size from room dimensions. Return only valid JSON."
            },
            {
              role: "user",
              content: floorplanCalculationPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 800,
          response_format: { type: "json_object" },
        });

        const floorplanData = JSON.parse(floorplanCompletion.choices[0]?.message?.content || '{}');
        console.log('🧮 AI floor plan calculation result:', floorplanData);
        
        if (floorplanData.totalSizeSqm && floorplanData.totalSizeSqft) {
          extractedData.size = `${floorplanData.totalSizeSqft.toLocaleString()} sq ft`;
          extractedData.sizeInSqm = Math.round(floorplanData.totalSizeSqm);
          console.log('🧮 Calculated size from room dimensions:', extractedData.size);
        }
      } catch (error) {
        console.log('❌ AI floor plan calculation failed:', error);
      }

      // If still no size found, try to download and analyze floor plan images
      if (!extractedData.size || !extractedData.sizeInSqm) {
        console.log('🖼️ No size from HTML, attempting to analyze floor plan images...');
        
        try {
          // Extract floor plan URLs from HTML - try multiple patterns
          const floorplanUrls = [];
          
          // Pattern 1: Look for floorplans array with FLP in URL
          const floorplanMatches = html.match(/"floorplans":\[([^\]]*)\]/g);
          if (floorplanMatches) {
            for (const match of floorplanMatches) {
              // Look for URLs with FLP (floor plan) in the filename
              const urlMatches = match.match(/"url":"([^"]*FLP[^"]*\.(?:jpeg|jpg|png|gif))"/gi);
              if (urlMatches) {
                floorplanUrls.push(...urlMatches.map(m => m.match(/"url":"([^"]*)"/)[1]));
              }
            }
          }
          
          // Pattern 2: Look for any image URLs containing "FLP" (floor plan)
          const flpMatches = html.match(/"url":"([^"]*FLP[^"]*\.(?:jpeg|jpg|png|gif))"/gi);
          if (flpMatches) {
            floorplanUrls.push(...flpMatches.map(m => m.match(/"url":"([^"]*)"/)[1]));
          }
          
          // Pattern 3: Look for floor plan images with "floorplan" in URL
          const generalFloorplanMatches = html.match(/"url":"([^"]*floorplan[^"]*\.(?:jpeg|jpg|png|gif))"/gi);
          if (generalFloorplanMatches) {
            floorplanUrls.push(...generalFloorplanMatches.map(m => m.match(/"url":"([^"]*)"/)[1]));
          }
          
          // Pattern 4: Look for floor plan images in different structures
          const altFloorplanMatches = html.match(/https:\/\/[^"]*FLP[^"]*\.(?:jpeg|jpg|png|gif)/gi);
          if (altFloorplanMatches) {
            floorplanUrls.push(...altFloorplanMatches);
          }
          
          // Remove duplicates
          const uniqueFloorplanUrls = [...new Set(floorplanUrls)];
          
          console.log('🖼️ Found floor plan URLs:', uniqueFloorplanUrls);
          console.log('🖼️ Total floor plan URLs found:', uniqueFloorplanUrls.length);
          
          if (uniqueFloorplanUrls.length > 0) {
            // Download the first floor plan image
            const floorplanUrl = uniqueFloorplanUrls[0];
            console.log('📥 Downloading floor plan image:', floorplanUrl);
            
            const imageResponse = await fetch(floorplanUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              const imageBase64 = Buffer.from(imageBuffer).toString('base64');
              
              console.log('🖼️ Analyzing floor plan image with computer vision...');
              
              // Use GPT-4V to analyze the floor plan image
              const imageAnalysisPrompt = `
You are a property floor plan analysis expert. Analyze this floor plan image to extract room dimensions and calculate the total property size.

CRITICAL INSTRUCTIONS:
1. Look VERY carefully for room dimensions written on the floor plan - they are usually in small text
2. Look for dimensions in both imperial (feet/inches) and metric (meters) formats
3. Common patterns: "13'6\" x 11'11\"", "4.12m x 3.64m", "12'10\" x 9'7\""
4. Dimensions are often written INSIDE each room or next to room labels
5. Look for measurements like "13'6\"", "11'11\"", "4.12m", "3.64m" etc.
6. Calculate the area of each room (length × width)
7. Add up all room areas to get total property size
8. Convert to both square meters and square feet
9. Return ONLY a JSON object with this structure:

{
  "totalSizeSqm": <number>,
  "totalSizeSqft": <number>,
  "roomBreakdown": [
    {"room": "<room name>", "dimensions": "<dimensions>", "areaSqm": <number>}
  ],
  "calculationMethod": "<how you calculated it>"
}

If no room dimensions are visible in the image, return:
{
  "totalSizeSqm": null,
  "totalSizeSqft": null,
  "roomBreakdown": [],
  "calculationMethod": "No room dimensions visible in floor plan image"
}

IMPORTANT: Look very carefully at the image - dimensions are often in small text within each room. Be thorough in your analysis.
`;

              const imageAnalysisCompletion = await openai.chat.completions.create({
                model: "gpt-4o", // Use GPT-4o for image analysis
                messages: [
                  {
                    role: "system",
                    content: "You are a property floor plan analysis expert. Analyze floor plan images to extract room dimensions and calculate total property size. Return only valid JSON."
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: imageAnalysisPrompt
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
                max_tokens: 1000,
                response_format: { type: "json_object" },
              });

              const imageAnalysisData = JSON.parse(imageAnalysisCompletion.choices[0]?.message?.content || '{}');
              console.log('🖼️ Floor plan image analysis result:', imageAnalysisData);
              
              if (imageAnalysisData.totalSizeSqm && imageAnalysisData.totalSizeSqft) {
                extractedData.size = `${imageAnalysisData.totalSizeSqft.toLocaleString()} sq ft`;
                extractedData.sizeInSqm = Math.round(imageAnalysisData.totalSizeSqm);
                console.log('🖼️ Calculated size from floor plan image:', extractedData.size);
              }
            } else {
              console.log('❌ Failed to download floor plan image:', imageResponse.status);
            }
          }
        } catch (error) {
          console.log('❌ Floor plan image analysis failed:', error);
        }
      }
    }

    // Use OpenAI API to extract any missing property details from HTML
    console.log('🤖 Using OpenAI API to extract missing property details...');
    
    const extractionPrompt = `
You are a property data extraction expert. Extract the following information from this Rightmove property listing HTML:

${html.substring(0, 20000)} // Limit HTML to first 20k chars to stay within token limits

Return a JSON object with this exact structure:
{
  "address": "Full property address or null",
  "price": "Price as number (e.g., 1150000) or null",
  "bedrooms": "Number as integer or null",
  "bathrooms": "Number as integer or null",
  "propertyType": "Type of property (e.g., Detached, Semi-Detached, etc.) or null",
  "size": "Size in original format (e.g., '3,333 sq ft') or null",
  "sizeInSqm": "Size in square meters as number or null",
  "description": "Property description or null"
}

Guidelines:
- Extract only information that is clearly visible in the HTML
- For price, extract the number only (no currency symbols)
- For bedrooms/bathrooms, extract as integers
- For size, look for patterns like "3,333 sq ft", "310 sq m", "SIZE" sections
- IMPORTANT: If size is not in main property details, check floor plan data, captions, or any size mentions in the HTML
- Look for floor plan captions that might contain size information
- For sizeInSqm, convert to square meters if needed (sq ft * 0.092903)
- Look for BATHROOMS, SIZE, PROPERTY TYPE sections in the HTML
- If any information is not available, use null
- Do not invent facts
- Return only valid JSON
`;

    // Only call OpenAI if we're missing critical data
    const missingFields = Object.entries(extractedData).filter(([key, value]) => value === null);
    
    if (missingFields.length > 0) {
      console.log('🤖 Missing fields, calling OpenAI for:', missingFields.map(([key]) => key));
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a property data extraction expert. Extract property information from HTML. Return only valid JSON."
          },
          {
            role: "user",
            content: extractionPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const aiExtractedData = JSON.parse(completion.choices[0]?.message?.content || '{}');
      console.log('🤖 OpenAI extracted data:', aiExtractedData);
      
      // Merge AI data with extracted data, only filling in missing fields
      Object.keys(extractedData).forEach(key => {
        if (extractedData[key] === null && aiExtractedData[key] !== null) {
          extractedData[key] = aiExtractedData[key];
        }
      });
    } else {
      console.log('✅ All data extracted from JSON, no need for OpenAI');
    }

    // Create a structured listing text using OpenAI extracted data
    const listingText = `${extractedData.address || 'Property Address'}

Price: £${extractedData.price || 'Price not found'}

Property Type: ${extractedData.propertyType || 'Type not specified'}
Bedrooms: ${extractedData.bedrooms || 'Not specified'}
Bathrooms: ${extractedData.bathrooms || 'Not specified'}
Size: ${extractedData.size || 'Not specified'}
Size in square meters: ${extractedData.sizeInSqm || 'Not specified'}

Description:
${extractedData.description || 'No description available'}

Additional details extracted from Rightmove listing using OpenAI API.`;

    return NextResponse.json({
      success: true,
      listingText: listingText,
      propertyDetails: extractedData
    });

  } catch (error) {
    console.error('Rightmove scraping error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to scrape Rightmove property',
      listingText: null
    });
  }
}
