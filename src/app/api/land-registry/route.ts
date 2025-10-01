import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { postcode, propertyType, limit = 50 } = await request.json();
    
    if (!postcode) {
      return NextResponse.json({
        success: false,
        error: 'Postcode is required'
      });
    }

    console.log('🏛️ LAND REGISTRY API - Fetching data for postcode:', postcode);

    // Clean postcode (remove spaces and convert to uppercase)
    const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
    
    // Build the Land Registry API URL for Price Paid Data (PPD)
    const baseUrl = 'https://landregistry.data.gov.uk/app/ppd/ppd_data.csv';
    
    // Get last 6 years to ensure we have 5 years of YoY comparison data
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 6);
    
    const params = new URLSearchParams({
      'ppd_data_type': 'price_paid',
      'limit': limit.toString(),
      'postcode': cleanPostcode,
      'property_type': propertyType || '',
      'from_date': fromDate.toISOString().split('T')[0],
      'to_date': toDate.toISOString().split('T')[0]
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    console.log('🔗 Land Registry URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'HomeLens-Property-Analysis/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Land Registry API error: ${response.status} ${response.statusText}`);
    }

    const csvData = await response.text();
    console.log('📊 Raw CSV data received, length:', csvData.length);

    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No property data found for this postcode'
      });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const properties = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const property = {};
        headers.forEach((header, index) => {
          property[header] = values[index];
        });
        properties.push(property);
      }
    }

    console.log(`✅ Parsed ${properties.length} properties from Land Registry`);

    // Calculate statistics
    const prices = properties
      .map(p => parseInt(p['Price Paid']) || 0)
      .filter(price => price > 0);

    const stats = {
      totalProperties: properties.length,
      averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      medianPrice: prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      priceRange: prices.length > 0 ? `${Math.min(...prices).toLocaleString()} - ${Math.max(...prices).toLocaleString()}` : 'N/A'
    };

    // Group by year for trend analysis
    const yearlyStats = {};
    properties.forEach(property => {
      if (property['Date of Transfer']) {
        const year = property['Date of Transfer'].split('-')[0];
        if (!yearlyStats[year]) {
          yearlyStats[year] = { count: 0, totalPrice: 0, prices: [] };
        }
        const price = parseInt(property['Price Paid']) || 0;
        if (price > 0) {
          yearlyStats[year].count++;
          yearlyStats[year].totalPrice += price;
          yearlyStats[year].prices.push(price);
        }
      }
    });

    // Calculate yearly averages
    Object.keys(yearlyStats).forEach(year => {
      const yearData = yearlyStats[year];
      yearData.averagePrice = Math.round(yearData.totalPrice / yearData.count);
      yearData.medianPrice = yearData.prices.sort((a, b) => a - b)[Math.floor(yearData.prices.length / 2)];
    });

    console.log(`📈 Yearly trends calculated for ${Object.keys(yearlyStats).length} years:`, 
      Object.keys(yearlyStats).sort().map(y => `${y}: £${yearlyStats[y].averagePrice.toLocaleString()} (${yearlyStats[y].count} sales)`).join(', ')
    );

    return NextResponse.json({
      success: true,
      data: {
        properties: properties.slice(0, 20), // Return first 20 for preview
        statistics: stats,
        yearlyTrends: yearlyStats,
        postcode: cleanPostcode,
        searchDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Land Registry API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
}

// Alternative endpoint for getting property details by address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const postcode = searchParams.get('postcode');

    if (!address && !postcode) {
      return NextResponse.json({
        success: false,
        error: 'Address or postcode is required'
      });
    }

    // This would be a more specific search - for now return a message
    return NextResponse.json({
      success: true,
      message: 'GET endpoint for specific address search - implement as needed',
      searchParams: { address, postcode }
    });

  } catch (error) {
    console.error('❌ Land Registry GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

