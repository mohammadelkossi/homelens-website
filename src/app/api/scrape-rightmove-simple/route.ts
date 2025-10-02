import { NextRequest, NextResponse } from 'next/server';

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

    // Simple fetch to get the HTML content
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

    // Extract property details using simple text parsing
    const extractPropertyDetails = (html: string) => {
      // Extract address (look for common patterns)
      const addressMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || 
                          html.match(/propertyTitle[^>]*>([^<]+)</) ||
                          html.match(/<title[^>]*>([^<]+)<\/title>/);
      
      // Extract price
      const priceMatch = html.match(/£([0-9,]+)/) || 
                        html.match(/price[^>]*>([^<]+)</);
      
      // Extract bedrooms
      const bedroomsMatch = html.match(/(\d+)\s*bed/i) ||
                           html.match(/bedrooms[^>]*>(\d+)/i);
      
      // Extract bathrooms
      const bathroomsMatch = html.match(/(\d+)\s*bath/i) ||
                           html.match(/bathrooms[^>]*>(\d+)/i);
      
      // Extract property type
      const typeMatch = html.match(/propertyType[^>]*>([^<]+)</) ||
                       html.match(/(detached|semi-detached|terraced|flat|apartment|bungalow)/i);
      
      // Extract description (look for common description patterns)
      const descriptionMatch = html.match(/description[^>]*>([^<]+)</) ||
                              html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</) ||
                              html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</);

      return {
        address: addressMatch ? addressMatch[1].trim() : null,
        price: priceMatch ? priceMatch[1].replace(/,/g, '') : null,
        bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : null,
        bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : null,
        propertyType: typeMatch ? typeMatch[1].trim() : null,
        description: descriptionMatch ? descriptionMatch[1].trim() : null
      };
    };

    const propertyDetails = extractPropertyDetails(html);
    console.log('📊 Extracted property details:', propertyDetails);

    // Create a structured listing text
    const listingText = `${propertyDetails.address || 'Property Address'}

Price: £${propertyDetails.price || 'Price not found'}

Property Type: ${propertyDetails.propertyType || 'Type not specified'}
Bedrooms: ${propertyDetails.bedrooms || 'Not specified'}
Bathrooms: ${propertyDetails.bathrooms || 'Not specified'}

Description:
${propertyDetails.description || 'No description available'}

Additional details extracted from Rightmove listing.`;

    return NextResponse.json({
      success: true,
      listingText: listingText,
      propertyDetails: propertyDetails
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
