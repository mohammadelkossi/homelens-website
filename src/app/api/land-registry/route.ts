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
    
    // Get data from 2021 to 2025 for 5-year trend analysis
    const fromDate = new Date('2021-01-01');
    const toDate = new Date('2025-12-31');
    
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

    // Parse CSV data - Land Registry CSV has no headers, just raw data
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          properties: [],
          statistics: { totalProperties: 0, averagePrice: 0, medianPrice: 0, minPrice: 0, maxPrice: 0, priceRange: 'N/A' },
          yearlyTrends: {},
          postcode: cleanPostcode,
          searchDate: new Date().toISOString()
        },
        message: 'No property data found for this postcode'
      });
    }

    // Land Registry CSV format (no headers):
    // 0: Transaction ID, 1: Price Paid, 2: Date of Transfer, 3: Postcode, 4: Property Type, 
    // 5: New Build, 6: Estate Type, 7: PAON, 8: SAON, 9: Street, 10: Locality, 
    // 11: Town/City, 12: District, 13: County, 14: PPD Category Type, 15: URL
    const properties = [];

    for (let i = 0; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= 16) {
        const property = {
          'Transaction ID': values[0],
          'Price Paid': values[1],
          'Date of Transfer': values[2],
          'Postcode': values[3],
          'Property Type': values[4],
          'New Build': values[5],
          'Estate Type': values[6],
          'PAON': values[7],
          'SAON': values[8],
          'Street': values[9],
          'Locality': values[10],
          'Town/City': values[11],
          'District': values[12],
          'County': values[13],
          'PPD Category Type': values[14],
          'URL': values[15]
        };
        properties.push(property);
      }
    }

    console.log(`✅ Parsed ${properties.length} properties from Land Registry`);

    // Filter by property type if specified
    let filteredProperties = properties;
    if (propertyType) {
      filteredProperties = properties.filter(property => {
        return property['Property Type'] === propertyType;
      });
      console.log(`🏠 Filtered by property type "${propertyType}": ${filteredProperties.length} properties`);
    }

    // Filter by date range (2021-2025) since Land Registry API date filtering doesn't work reliably
    const filterFromDate = new Date('2021-01-01');
    const filterToDate = new Date('2025-12-31');
    
    filteredProperties = filteredProperties.filter(property => {
      if (!property['Date of Transfer']) return false;
      
      const saleDate = new Date(property['Date of Transfer']);
      const isInRange = saleDate >= filterFromDate && saleDate <= filterToDate;
      
      // Debug logging for first few properties
      if (filteredProperties.indexOf(property) < 3) {
        console.log(`📅 Date check: ${property['Date of Transfer']} -> ${saleDate.toISOString()} >= ${filterFromDate.toISOString()} && <= ${filterToDate.toISOString()} = ${isInRange}`);
      }
      
      return isInRange;
    });
    console.log(`📅 Filtered to ${filteredProperties.length} properties from 2021-2025`);

    // Calculate statistics from filtered properties
    const prices = filteredProperties
      .map(p => parseInt(p['Price Paid']) || 0)
      .filter(price => price > 0);

    const stats = {
      totalProperties: filteredProperties.length,
      averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      medianPrice: prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      priceRange: prices.length > 0 ? `${Math.min(...prices).toLocaleString()} - ${Math.max(...prices).toLocaleString()}` : 'N/A'
    };

    // Group by year for trend analysis (use filtered properties)
    const yearlyStats = {};
    filteredProperties.forEach(property => {
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
        properties: filteredProperties.slice(0, 20), // Return first 20 filtered properties for preview
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

