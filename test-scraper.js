// Simple test script to verify the scraper is working
const { scrapeRightmoveProperty } = require('./src/lib/scraper.ts');

async function testScraper() {
  try {
    console.log('Testing scraper with a real Rightmove URL...');
    
    // Test with a real Rightmove URL (you can replace this with any valid Rightmove property URL)
    const testUrl = 'https://www.rightmove.co.uk/properties/12345678';
    
    const result = await scrapeRightmoveProperty(testUrl);
    
    console.log('✅ Scraper test results:');
    console.log('Price:', result.price);
    console.log('Address:', result.address);
    console.log('Postcode:', result.postcode);
    console.log('Bedrooms:', result.bedrooms);
    console.log('Bathrooms:', result.bathrooms);
    console.log('Property Type:', result.propertyType);
    console.log('Size:', result.size);
    console.log('Description length:', result.description.length);
    console.log('Images count:', result.images.length);
    console.log('Features count:', result.features?.length || 0);
    
    // Check if we got meaningful data
    if (result.address && result.price > 0) {
      console.log('✅ Scraper is working correctly!');
    } else {
      console.log('⚠️ Scraper returned incomplete data - Rightmove may have changed their structure');
    }
    
  } catch (error) {
    console.error('❌ Scraper test failed:', error.message);
  }
}

testScraper();


