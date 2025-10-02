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

    // Use OpenAI API to extract property details from HTML
    console.log('🤖 Using OpenAI API to extract property details...');
    
    const extractionPrompt = `
You are a property data extraction expert. Extract the following information from this Rightmove property listing HTML:

${html.substring(0, 15000)} // Limit HTML to first 15k chars to stay within token limits

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

    const extractedData = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('🤖 OpenAI extracted data:', extractedData);

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
