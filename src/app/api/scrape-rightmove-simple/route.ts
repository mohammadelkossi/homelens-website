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

    // Extract property details using improved text parsing
    const extractPropertyDetails = (html: string) => {
      console.log('🔍 Extracting property details from HTML...');
      
      // Extract address (look for common patterns)
      const addressMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || 
                          html.match(/propertyTitle[^>]*>([^<]+)</) ||
                          html.match(/<title[^>]*>([^<]+)<\/title>/);
      
      // Extract price - look for £1,375,000 pattern
      const priceMatch = html.match(/£([0-9,]+)/) || 
                        html.match(/price[^>]*>([^<]+)</);
      
      // Extract bedrooms - look for "5" in BEDROOMS section
      const bedroomsMatch = html.match(/BEDROOMS[^>]*>(\d+)/i) ||
                           html.match(/<span[^>]*>(\d+)<\/span>[^<]*BEDROOMS/i) ||
                           html.match(/(\d+)\s*bed/i) ||
                           html.match(/bedrooms[^>]*>(\d+)/i) ||
                           html.match(/BEDROOMS.*?(\d+)/i);
      
      // Extract bathrooms - look for "3" in BATHROOMS section  
      const bathroomsMatch = html.match(/BATHROOMS[^>]*>(\d+)/i) ||
                           html.match(/<span[^>]*>(\d+)<\/span>[^<]*BATHROOMS/i) ||
                           html.match(/(\d+)\s*bath/i) ||
                           html.match(/bathrooms[^>]*>(\d+)/i) ||
                           html.match(/BATHROOMS.*?(\d+)/i);
      
      // Extract property type - look for "Detached" in PROPERTY TYPE section
      const typeMatch = html.match(/PROPERTY TYPE[^>]*>([^<]+)</i) ||
                       html.match(/propertyType[^>]*>([^<]+)</) ||
                       html.match(/(detached|semi-detached|terraced|flat|apartment|bungalow)/i) ||
                       html.match(/PROPERTY TYPE.*?([A-Za-z\s-]+)/i);
      
      // Extract size - look for "3,333 sq ft" or "310 sq m"
      console.log('🔍 Looking for size data...');
      let sizeMatch = html.match(/SIZE[^>]*>([^<]+)</i) ||
                     html.match(/<span[^>]*>([^<]+)<\/span>[^<]*SIZE/i) ||
                     html.match(/SIZE.*?(\d+,?\d*\s*sq\s*ft)/i) ||
                     html.match(/SIZE.*?(\d+\s*sq\s*m)/i) ||
                     html.match(/(\d+,?\d*)\s*sq\s*ft/i) ||
                     html.match(/(\d+)\s*sq\s*m/i) ||
                     html.match(/3,333\s*sq\s*ft/i) ||
                     html.match(/310\s*sq\s*m/i);
      
      console.log('📏 Size match result:', sizeMatch);
      
      // If no size match, try to find any size pattern in the HTML
      if (!sizeMatch) {
        console.log('🔍 No size match found, trying alternative patterns...');
        const altSizeMatch = html.match(/(\d{3,4})\s*sq\s*ft/i) ||
                           html.match(/(\d{2,3})\s*sq\s*m/i) ||
                           html.match(/sq\s*ft[^>]*>(\d+,?\d*)/i) ||
                           html.match(/sq\s*m[^>]*>(\d+)/i);
        console.log('📏 Alternative size match:', altSizeMatch);
        if (altSizeMatch) {
          sizeMatch = altSizeMatch;
        }
      }
      
      // If still no match, try more aggressive patterns
      if (!sizeMatch) {
        console.log('🔍 Trying aggressive size patterns...');
        const aggressiveMatch = html.match(/(\d{1,4}(?:,\d{3})*)\s*sq\s*ft/i) ||
                              html.match(/(\d{1,4}(?:,\d{3})*)\s*sq\s*ft/i) ||
                              html.match(/(\d{2,4})\s*sq\s*m/i) ||
                              html.match(/sq\s*ft[^>]*(\d{1,4}(?:,\d{3})*)/i) ||
                              html.match(/sq\s*m[^>]*(\d{2,4})/i);
        console.log('📏 Aggressive size match:', aggressiveMatch);
        if (aggressiveMatch) {
          sizeMatch = aggressiveMatch;
        }
      }
      
      // If still no match, try to find any size-related text in the HTML
      if (!sizeMatch) {
        console.log('🔍 Searching for any size-related text in HTML...');
        const sizeTextMatch = html.match(/(\d{1,4}(?:,\d{3})*)\s*(?:sq\s*ft|sq\s*feet|square\s*feet)/i) ||
                            html.match(/(\d{2,4})\s*(?:sq\s*m|sq\s*meters|square\s*meters)/i) ||
                            html.match(/(\d{1,4}(?:,\d{3})*)\s*ft/i) ||
                            html.match(/(\d{2,4})\s*m/i);
        console.log('📏 Size text match:', sizeTextMatch);
        if (sizeTextMatch) {
          sizeMatch = sizeTextMatch;
        }
      }
      
      // Convert size to square meters if needed
      let sizeInSqm = null;
      if (sizeMatch) {
        const sizeText = sizeMatch[1].trim();
        if (sizeText.includes('sq ft')) {
          const sqft = parseFloat(sizeText.replace(/[^\d.]/g, ''));
          sizeInSqm = Math.round(sqft * 0.092903); // Convert sq ft to sq m
        } else if (sizeText.includes('sq m')) {
          sizeInSqm = parseFloat(sizeText.replace(/[^\d.]/g, ''));
        }
      }
      
      // Extract description (look for common description patterns)
      const descriptionMatch = html.match(/description[^>]*>([^<]+)</) ||
                              html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</) ||
                              html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</);

      const details = {
        address: addressMatch ? addressMatch[1].trim() : null,
        price: priceMatch ? priceMatch[1].replace(/,/g, '') : null,
        bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : null,
        bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : null,
        propertyType: typeMatch ? typeMatch[1].trim() : null,
        size: sizeMatch ? sizeMatch[1].trim() : null,
        sizeInSqm: sizeInSqm,
        description: descriptionMatch ? descriptionMatch[1].trim() : null
      };
      
      console.log('📊 Extracted details:', details);
      return details;
    };

    const propertyDetails = extractPropertyDetails(html);
    console.log('📊 Extracted property details:', propertyDetails);

    // Create a structured listing text
    const listingText = `${propertyDetails.address || 'Property Address'}

Price: £${propertyDetails.price || 'Price not found'}

Property Type: ${propertyDetails.propertyType || 'Type not specified'}
Bedrooms: ${propertyDetails.bedrooms || 'Not specified'}
Bathrooms: ${propertyDetails.bathrooms || 'Not specified'}
Size: ${propertyDetails.size || 'Not specified'}
Size in square meters: ${propertyDetails.sizeInSqm || 'Not specified'}

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
