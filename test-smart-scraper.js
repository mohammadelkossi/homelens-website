// Test script for smart scraper
const { smartScrapeProperty } = require('./src/lib/smartScraper.ts');

async function testSmartScraper() {
  console.log('🧪 Testing Smart Scraper...');
  
  // Test with a real Rightmove URL
  const testUrl = 'https://www.rightmove.co.uk/properties/12345678';
  
  try {
    const result = await smartScraperProperty(testUrl);
    
    console.log('\n📊 Results:');
    console.log(`Method: ${result.method}`);
    console.log(`Price: £${result.data.price.toLocaleString()}`);
    console.log(`Address: ${result.data.address}`);
    console.log(`Bedrooms: ${result.data.bedrooms}`);
    console.log(`Property Type: ${result.data.propertyType}`);
    
    if (result.method === 'openai_fallback') {
      console.log(`\n⚠️ Fallback used: ${result.fallbackReason}`);
      if (result.missingFields) {
        console.log(`Missing fields: ${result.missingFields.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSmartScraper();
