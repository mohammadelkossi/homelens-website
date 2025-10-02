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
    const scriptMatch = html.match(/window\.PAGE_MODEL\s*=\s*({[\s\S]*?});\s*<\/script>/);
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
