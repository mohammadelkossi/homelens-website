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

    // Call Apify Rightmove Scraper
    const apifyResponse = await fetch('https://api.apify.com/v2/acts/dhrumil~rightmove-scraper/run-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`
      },
      body: JSON.stringify({
        propertyUrls: [rightmoveUrl],
        includeFullPropertyDetails: true,
        includePriceHistory: true,
        includeNearestSchools: true
      })
    });

    if (!apifyResponse.ok) {
      throw new Error(`Apify API error: ${apifyResponse.statusText}`);
    }

    const apifyData = await apifyResponse.json();
    console.log('✅ Apify scraping completed');

    // Process and structure the data
    const processedData = {
      // Basic property info
      title: apifyData.title,
      price: apifyData.price,
      address: apifyData.address,
      postcode: apifyData.postcode,
      description: apifyData.description,
      
      // Property details
      bedrooms: apifyData.bedrooms,
      bathrooms: apifyData.bathrooms,
      propertyType: apifyData.propertyType,
      size: apifyData.size,
      
      // Features (binary criteria)
      garden: apifyData.garden || false,
      parking: apifyData.parking || false,
      garage: apifyData.garage || false,
      newBuild: apifyData.newBuild || false,
      
      // Additional details
      images: apifyData.images || [],
      agent: apifyData.agent,
      priceHistory: apifyData.priceHistory || [],
      nearestSchools: apifyData.nearestSchools || [],
      
      // Location data
      coordinates: apifyData.coordinates,
      area: apifyData.area
    };

    return NextResponse.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('Rightmove scraping error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to scrape Rightmove property',
      data: null
    });
  }
}