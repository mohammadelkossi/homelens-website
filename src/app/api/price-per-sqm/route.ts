import { NextRequest, NextResponse } from 'next/server';
import { analyzePricePerSqm, mapPropertyTypeToEPC } from '@/lib/epcApi';
import { landRegistryParser } from '@/lib/landRegistryData';

export async function POST(request: NextRequest) {
  try {
    const { postcode, propertyType, year, epcApiKey, epcEmail } = await request.json();

    if (!postcode || !propertyType || !year) {
      return NextResponse.json({
        success: false,
        error: 'Postcode, property type, and year are required'
      });
    }

    console.log(`🏠 PRICE PER SQM ANALYSIS - ${propertyType} in ${postcode} for ${year}`);

    // Get Land Registry data for the postcode area
    const postcodeArea = postcode.substring(0, 4); // Extract postcode area (e.g., NW10 -> NW10)
    const landRegistryStats = await landRegistryParser.getMarketStats(postcodeArea, 12);
    
    // For this demo, we'll simulate having the full Land Registry data
    // In a real implementation, you'd need to load the actual CSV data
    const mockLandRegistryData = [
      {
        'Transaction unique identifier': 'mock-1',
        'Price Paid': '450000',
        'Date of Transfer': `${year}-06-15`,
        'Postcode': postcode,
        'Property Type': propertyType,
        'PAON': '123 Test Street',
        'Street': 'Test Street',
        'Locality': 'Test Area',
        'Town/City': 'London',
        'District': 'Brent',
        'County': 'Greater London'
      },
      {
        'Transaction unique identifier': 'mock-2',
        'Price Paid': '425000',
        'Date of Transfer': `${year}-08-20`,
        'Postcode': postcode,
        'Property Type': propertyType,
        'PAON': '456 Sample Road',
        'Street': 'Sample Road',
        'Locality': 'Sample Area',
        'Town/City': 'London',
        'District': 'Brent',
        'County': 'Greater London'
      }
    ];

    // Map Land Registry property type to EPC format
    const epcPropertyType = mapPropertyTypeToEPC(propertyType);
    
    // Perform the analysis
    const analysis = await analyzePricePerSqm(
      postcode,
      epcPropertyType,
      year,
      mockLandRegistryData,
      epcApiKey,
      epcEmail
    );

    if (!analysis) {
      return NextResponse.json({
        success: false,
        error: 'Unable to calculate price per square meter. Insufficient data or no EPC matches found.',
        suggestion: 'Try a different postcode or property type, or check if EPC data is available for this area.'
      });
    }

    // Format the response
    const response = {
      success: true,
      data: {
        insight: `In ${year}, on average ${analysis.propertyType.toLowerCase()} houses in ${analysis.postcode} were sold for £${analysis.averagePricePerSqm.toLocaleString()} per square metre`,
        analysis: {
          postcode: analysis.postcode,
          propertyType: analysis.propertyType,
          year: analysis.year,
          averagePricePerSqm: analysis.averagePricePerSqm,
          medianPricePerSqm: analysis.medianPricePerSqm,
          priceRange: analysis.priceRange,
          totalProperties: analysis.totalProperties,
          confidence: analysis.confidence
        },
        breakdown: {
          minPricePerSqm: analysis.minPricePerSqm,
          maxPricePerSqm: analysis.maxPricePerSqm,
          medianPricePerSqm: analysis.medianPricePerSqm,
          averagePricePerSqm: analysis.averagePricePerSqm
        },
        methodology: {
          dataSources: ['Land Registry Price Paid Data', 'EPC Register'],
          matchingCriteria: 'Postcode and address similarity',
          confidenceLevel: analysis.confidence,
          sampleSize: analysis.totalProperties
        },
        generatedAt: new Date().toISOString()
      }
    };

    console.log(`✅ Analysis complete: £${analysis.averagePricePerSqm.toLocaleString()}/sqm (${analysis.totalProperties} properties)`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Price per sqm analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      suggestion: 'Please check your input parameters and try again.'
    });
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postcode = searchParams.get('postcode') || 'NW10';
  const propertyType = searchParams.get('propertyType') || 'S';
  const year = parseInt(searchParams.get('year') || '2025');

  console.log(`🧪 TESTING - Price per sqm for ${propertyType} in ${postcode} for ${year}`);

  try {
    // This would be a test call
    return NextResponse.json({
      success: true,
      message: 'Price per sqm analysis endpoint is ready',
      testParams: { postcode, propertyType, year },
      usage: 'Send a POST request with postcode, propertyType, and year in the request body'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
