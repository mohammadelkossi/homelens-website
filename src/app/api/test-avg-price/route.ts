import { NextResponse } from 'next/server';
import { fetch12MonthAverageSoldPrice } from '@/lib/market';

export async function GET() {
  console.log('🧪 Testing 12-month average sold price calculation...');
  
  const testPostcode = 'S10';
  const testPropertyType = 'Semi-Detached';
  
  console.log(`📍 Test inputs: postcode="${testPostcode}", propertyType="${testPropertyType}"`);
  
  try {
    const result = await fetch12MonthAverageSoldPrice(testPostcode, testPropertyType);
    
    return NextResponse.json({
      success: true,
      postcode: testPostcode,
      propertyType: testPropertyType,
      averagePrice: result,
      formatted: `£${result.toLocaleString()}`
    });
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}


